import debug from './debug'
import Joi from 'joi'
import { metadataFor } from './metadata'

const log = debug('schema')

export class Schema {
    /**
     * A copy version Joi. Prevent modify global Joi options.
     */
    static Joi = Joi.defaults(s => s)

    /**
     * Get metadata and all parent metadata then merge to one.
     */
    static get metadata(): Metadata {
        const metadatas = []
        let proto = this.prototype
        do {
            metadatas.unshift(metadataFor(proto) || {})
        } while (proto = Object.getPrototypeOf(proto))

        return Object.assign({}, ...metadatas)
    }

    /**
     * Compile Joi validator with metadata design type or user defined Joi schema.
     */
    static get validator() {
        const metadata = this.metadata
        const schema = Object.keys(metadata).reduce((obj, key) => {
            const meta = metadata[key]
            const val = meta['tdv:joi'] || meta['tdv:ref'] && meta['tdv:ref']['validator']
            if (val) {
                log('push field %s into validator', key)
                obj[key] = val
            }
            return obj
        }, {})

        return this.Joi.object(schema)
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
        const metadata: Metadata = this.constructor['metadata']

        for (const key in metadata) {
            const meta = metadata[key]
            const value = props[key]

            const Ref = meta['tdv:ref']
            const joi = meta['tdv:joi']

            if (Ref) {
                // skip sub model
                if (!(key in props)) continue

                if (value instanceof Ref || value === null || value === undefined) {
                    // pass sub model instance or null directly
                    this[key] = value
                    continue
                } else if (!this[key]) {
                    // init sub model if not exist
                    this[key] = new Ref()
                }

                if (this[key].parse) {
                    // sub model can parse value
                    this[key].parse(value, options)
                } else if (value && typeof value === 'object') {
                    // non schema has tdv meta?
                    Object.assign(this[key], value)
                }
            } else if (joi && convert) {
                const result = joi.validate(value)

                if (result.error) {
                    // joi invalid value
                    this[key] = value
                } else {
                    // joi validate will cast trans and set default value
                    this[key] = result.value
                }
            } else {
                this[key] = value
            }
        }

        return this
    }

    /**
     * Validate by Joi
     * 
     * * Set allowUnknown option to true if not present.
     * * Be careful the value returned is a new instance. This is design by Joi.
     */
    validate(options = {} as ValidationOptions) {
        const { apply, raise, ...opts } = options
        if (!('allowUnknown' in opts)) opts.allowUnknown = true

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
     * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
     */
    toJSON(key?: string): { [key: string]: any } {
        const metadata: Metadata = this.constructor['metadata']

        if (!metadata) return {}

        const obj = {}
        for (let key in metadata) {
            const value = this[key]

            if (value && typeof value.toJSON == 'function') {
                obj[key] = value.toJSON()
            } else if (typeof value !== 'undefined') {
                obj[key] = value
            }
        }

        return obj
    }
}

/* TYPES */

export interface SchemaOptions {
    /**
     * Convert by Joi. when `true`, attempts to cast values to the required types (e.g. a string to a number, or apply default value). Defaults to `true`.
     */
    convert?: boolean
}

export interface Metadata {
    [propertyKey: string]: MetadataProperty
}

export interface MetadataProperty {
    'design:type'?: Function | typeof Schema
    'design:paramtypes'?: Function[]
    'design:returntype'?: Function

    'tdv:joi'?: Joi.Schema
    'tdv:ref'?: typeof Schema
}

export interface ValidationOptions extends Joi.ValidationOptions {
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
export type ScalarPropertyNames<T> = {[K in keyof T]: T[K] extends Schema | Function ? never : K }[keyof T]
export type SchemaPropertyNames<T> = {[K in keyof T]: T[K] extends Schema ? K : never }[keyof T]
export type PickSchemaProperties<T, K extends keyof T> = { [P in K]: T[P] | SchemaProperties<T[P]> }
