import debug from './debug'
import 'reflect-metadata'
import Joi from 'joi'

const log = debug('schema')

export class Schema {
    /**
     * A copy version Joi. Prevent modify global Joi options.
     */
    static Joi = Joi.defaults(s => s)

    /**
     * Get field metadata.
     * 
     * Includes properties decorate by required/optinal/reference.
     */
    static get metadata(): SchemaMetadata {
        if (Reflect.hasOwnMetadata('tdv:cache:metadata', this)) {
            return Reflect.getOwnMetadata('tdv:cache:metadata', this)
        }

        const metadata = (Reflect.getMetadataKeys(this.prototype) as string[])
            // .reverse()
            .filter(key => key.startsWith('tdv:key:'))
            .map(key => key.substr(8))
            .reduce((metadata, property) => {
                metadata[property] = (Reflect.getMetadataKeys(this.prototype, property) as string[])
                    .reduce((fieldmeta, annotation) => {
                        fieldmeta[annotation] = Reflect.getMetadata(annotation, this.prototype, property)
                        return fieldmeta
                    }, {})
                return metadata
            }, {} as SchemaMetadata)

        /*
         * Memoize metadata
         * Extended class share one static getter.
         * We need a weakmap to hold different data for sub class. Reflect help us.
         */
        Reflect.defineMetadata('tdv:cache:metadata', metadata, this)

        return metadata
    }

    /**
     * Compile Joi validator with metadata design type or user defined Joi schema.
     */
    static get validator(): Joi.ObjectSchema {
        if (Reflect.hasOwnMetadata('tdv:cache:validator', this)) {
            return Reflect.getOwnMetadata('tdv:cache:validator', this)
        }

        const validator = this.Joi.object(Object.keys(this.metadata).reduce((obj, key) => {
            const meta = this.metadata[key]
            const joi = meta['tdv:joi']
            const ref = meta['tdv:ref']

            if (joi) {
                obj[key] = joi
            } else if (ref) {
                if (Array.isArray(ref)) {
                    obj[key] = this.Joi.array().items(ref[0]['validator'])
                } else if (ref['validator']) {
                    obj[key] = ref['validator']
                }
            }

            return obj
        }, {}))

        Reflect.defineMetadata('tdv:cache:validator', validator, this)

        return validator
    }

    /**
     * Build a new instance and `parse` props
     * 
     * Skip `parse` if props not present.
     * 
     * If provide props. It must follow correct type(`SchemaProperties<this>`). Otherwise typescript should complain to you. If you want to provide partial props. Consider use `new({})`
     */
    static build<S extends Schema>(
        this: SchemaStatic<S>,
        props?: SchemaProperties<S>,
        options?: SchemaOptions
    ) {
        let instance = new this() as S
        if (props) instance = instance.parse(props, options)
        return instance
    }

    /**
     * Schema instance
     * 
     * There are 3 ways to create empty instance:
     * * `new()` plain empty instance
     * * `new({})` empty instance with joi default value
     * * `new({}, {convert: false})` empty instance all undefined
     * 
     * Set initial props.
     * * `new({...props})` should `parse` props recursively
     * * `new({...props}, {convert: false})` `parse` props but skip joi casting and default.
     */
    constructor(props?, options?: SchemaOptions) {
        if (props) this.parse(props, options)
    }

    /**
     * Parse props recursively into this instance
     * 
     * * If property type is Schema. Instance and call `parse` method on it.
     * * If value is `null` or `undefined`. Set directly.
     * * If convert option is true and Joi schema exists. Process value by Joi.validate then set value when valid.
     * * If convert option is false or value is invalid to Joi schema. Set directly and leave there untouch.
     * 
     * @param options.convert casting and apply default by Joi. default true
     */
    parse(
        props = {} as SchemaProperties<this>,
        options = {} as SchemaOptions
    ) {
        const { convert = true } = options
        const metadata: SchemaMetadata = this.constructor['metadata']

        for (const property in metadata) {
            const meta = metadata[property]
            const value = props[property]

            const Ref = meta['tdv:ref']
            const joi = meta['tdv:joi']

            if (Ref) {
                // skip sub model
                if (!(property in props)) continue

                if (Array.isArray(Ref)) {
                    if (Array.isArray(value)) {
                        this[property] = value.map(v => v instanceof Ref[0] ? v : new Ref[0](v, options))
                    } else {
                        this[property] = []
                    }
                } else if (value instanceof Ref || value === null || value === undefined) {
                    // pass sub model instance or null directly
                    this[property] = value
                } else if (typeof value === 'object') {
                    // init sub model if not exist
                    if (!this[property]) {
                        this[property] = new Ref(value, options)
                    } else {
                        // TODO: how to handle existed non ref value?
                    }
                }
            } else if (joi && convert) {
                const result = joi.validate(value)

                if (result.error) {
                    // joi invalid value
                    this[property] = value
                } else {
                    // joi validate will cast trans and set default value
                    // joi support convert string to number/boolean/binary/date/array/object
                    this[property] = result.value
                }
            } else {
                this[property] = value
            }
        }

        return this
    }

    /**
     * Validate by Joi
     * 
     * * Be careful the value returned is a new instance. This is design by Joi.
     */
    validate(options = {} as SchemaValidationOptions) {
        const { apply, raise, ...opts } = options

        const validator: Joi.Schema = this.constructor['validator']
        const result = validator.validate(this, opts)

        if (result.error) {
            if (raise) throw result.error
        } else if (apply) {
            this.parse(result.value)
        }

        return result
    }

    /**
     * JSON stringify interface
     * 
     * * Only serializing the keys exists in metadata.
     * 
     * @param key
     * 
     * * if this object is a property value, the property name.
     * * if it is in an array, the index in the array, as a string.
     * * an empty string if JSON.stringify() was directly called on this object
     * 
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
     */
    toJSON(key?: string): { [key: string]: any } {
        const metadata: SchemaMetadata = this.constructor['metadata']
        if (!metadata) return {}

        const json = {}

        for (let key in metadata) {
            const value = this[key]

            if (typeof value === 'undefined') continue

            if (value) {
                if (value instanceof Schema) {
                    log('instanceof', value)

                    json[key] = value.toJSON(key)
                } else if (Array.isArray(value)) {
                    log('isArray', value)

                    json[key] = value.map((value, index) => value instanceof Schema
                        ? value.toJSON(index.toString())
                        : value
                    )
                } else {
                    log('truly', value)

                    json[key] = value
                }
            } else {
                log('faily', value)

                json[key] = value
            }
        }

        return json
    }
}

/* TYPES */

export type SchemaClass = typeof Schema

export interface SchemaOptions {
    /**
     * Convert by Joi. when `true`, attempts to cast values to the required types (e.g. a string to a number, or apply default value). Defaults to `true`.
     */
    convert?: boolean
}

export interface SchemaMetadata {
    [propertyKey: string]: SchemaMetadataProperty
}

export interface SchemaMetadataProperty {
    'design:type'?: Function | SchemaClass
    'design:paramtypes'?: Function[]
    'design:returntype'?: Function

    'tdv:joi'?: Joi.Schema
    'tdv:ref'?: SchemaClass | SchemaClass[]
}

export interface SchemaValidationOptions extends Joi.ValidationOptions {
    /**
     * Apply validate result value, `parse` it if valid.
     */
    apply?: boolean
    /**
     * Validates a value, returns valid result, and throws if validation fails. Similar `Joi.attempt`.
     */
    raise?: boolean
}

/**
 * Schema static method this type
 * This hack make sub class static method return sub instance
 * But break IntelliSense autocomplete in Typescript@2.7
 * 
 * @example
 * 
 *      static method<S extends Schema>(this: SchemaStatic<S>)
 * 
 * @see https://github.com/Microsoft/TypeScript/issues/5863#issuecomment-302891200
 */
export type SchemaStatic<T> = typeof Schema & {
    new(...args): T
}

/**
 * Pick Schema non function properties
 * 
 * @example
 * 
 *  class Foo {
 *      static build(props?: SchemaProperties<Foo>) {
 *          // props: { id: number, name?: string }
 *      }
 *      id: number
 *      name?: string
 *      say() {}
 *  }
 * 
 * @see http://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html
 * 
 * This cannot use on constructor.
 */
export type SchemaProperties<T> = T | Pick<T, ScalarPropertyNames<T>> & PickSchemaProperties<T, SchemaPropertyNames<T>>
export type ScalarPropertyNames<T> = { [K in keyof T]: T[K] extends Function | Schema | Schema[] ? never : K }[keyof T]
export type SchemaPropertyNames<T> = { [K in keyof T]: T[K] extends Schema | Schema[] ? K : never }[keyof T]
export type PickSchemaProperties<T, K extends keyof T> = { [P in K]: T[P] | SchemaProperties<T[P]> }
// export type SchemaArrayPropertyNames<T> = { [K in keyof T]: T[K] extends Schema[] ? K : never }[keyof T]
// export type PickSchemaArrayProperties<T, K extends keyof T> = { [P in K]: T[P] | SchemaProperties<T[P]> }
