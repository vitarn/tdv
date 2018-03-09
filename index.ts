import { debuglog } from 'util'
import Joi from 'joi'

/* LOG */

const log = debuglog('tdv')

// let log: (...args) => void
// try {
//     log = require('debug')('tdv')
// } catch (err) {
//     log = debuglog('tdv')
// }

/* SYMBOLS */

export const $metadata = Symbol.for('$metadata')
export const $validator = Symbol.for('$validator')

/* DECORATORS */

/**
 * Reflect.metadata
 * Typescript emit `__metadata` into decorators array. Then try invoke this.
 * It's good chance return a new decorator.
 * tsconfig.json { "emitDecoratorMetadata": true }
 * @see http://nicholasjohnson.com/blog/how-angular2-di-works-with-typescript/
 */
Object.assign(Reflect, {
    metadata: (metaKey: string, metaValue: any) => {
        const decorator: PropertyDecorator = (target, propertyKey) => {
            log('@__metadata', propertyKey)
            writeMetadata(target, propertyKey, {
                [metaKey]: metaValue
            })
        }

        return decorator
    }
})

/**
 * Store all metadata
 * Key is Schema class
 * Value is prop/config pairs
 */
const metadataMap: MetadataMap = new Map()

const decoratorBuilder = (options: DecoratorBuilderOptions = {}) => (targetOrFn: object | JoiBuilder, propertyKey?: string | symbol) => {
    if (typeof targetOrFn === 'function') {
        const fn = targetOrFn
        const decorator: PropertyDecorator = (target, propertyKey) => {
            log('@field(fn)', propertyKey)
            let joi = fn(Joi)
            if (options.required) joi = joi.required()
            writeMetadata(target, propertyKey, {
                joi
            })
        }

        return decorator as any
    } else if (typeof propertyKey === 'string') {
        log('@field', propertyKey)
        const target = targetOrFn
        const metaValue = metadataMap.get(target) || {}
        const propValue = metaValue[propertyKey] || {} as MetadataPropertyValue
        const designType = propValue['design:type']

        if (Schema.isPrototypeOf(designType)) {
            const ref = designType as Schema
            writeMetadata(targetOrFn, propertyKey, {
                ref,
            })
        } else {
            let joi = designTypeToJoi(designType as Function)
            if (options.required) joi = joi.required()
            writeMetadata(targetOrFn, propertyKey, {
                joi,
            })
        }
    }
}

/**
 * Required field decorator of schema
 * @example
 *      @required name: string
 *      @required(Joi => Joi.string()) name: string
 */
export const required = decoratorBuilder({ required: true })

/**
 * Optional field decorator of schema
 * @example
 *      @optional name?: string
 *      @optional(Joi => Joi.string()) name?: string
 */
export const optional = decoratorBuilder()

export function getFullMetadata(target: Object): MetadataValue {
    const metadatas = [metadataMap.get(target)]

    let proto = target
    // log('find prototype chain for ', proto)
    while (proto = Object.getPrototypeOf(proto)) {
        // log('next prototype', proto)
        metadatas.unshift(metadataMap.get(proto) || {})
    }

    return Object.assign({}, ...metadatas)
}

function writeMetadata(target: Object, propertyKey: string | symbol, partial: Partial<MetadataPropertyValue>) {
    const metadata: MetadataValue = metadataMap.get(target) || {}
    const val = metadata[propertyKey] = metadata[propertyKey] || {} as MetadataPropertyValue

    Object.assign(val, partial)

    metadataMap.set(target, metadata)
    // console.log('write metadata key %s into %o %d', propertyKey, target, meta.size)
}

function designTypeToJoi(designType: Function) {
    switch (designType) {
        case Number:
            return Joi.number()
        case String:
            return Joi.string()
        case Boolean:
            return Joi.boolean()
        case Buffer:
            return Joi.binary()
        case Function:
            return Joi.func()
        default:
            return Joi.any()
    }
}

/* SCHEMA */

export class Schema {
    static get [$metadata](): MetadataValue {
        return getFullMetadata(this.prototype) || {}
    }

    static get [$validator]() {
        const metadata: MetadataValue = this[$metadata]
        const schema = Object.keys(metadata).reduce((obj, key) => {
            log('push field %s into validator', key)
            obj[key] = metadata[key].joi || metadata[key].ref[$validator]
            return obj
        }, {})
        return Joi.object(schema)
    }

    constructor(props = {}) {
        // super()
        Object.assign(this, props)
    }

    validate() {
        const validator: Joi.Schema = this.constructor[$validator]

        return validator.validate(this.toJSON())
    }

    attempt() {
        const validator: Joi.Schema = this.constructor[$validator]

        return Joi.attempt(this.toJSON(), validator)
    }

    toJSON(): { [key: string]: any } {
        const metadata: MetadataValue = this.constructor[$metadata]

        if (!metadata) return {}

        const obj = {}
        for (let key of Object.keys(metadata)) {
            const value = this[key]
            obj[key] = value && typeof value.toJSON == 'function'
                ? value.toJSON()
                : value
        }

        return obj
    }
}

/* TYPES */

export type JoiBuilder = (Joi: Joi.Root) => Joi.Schema

export type MetadataMap = Map<Object, MetadataValue>

export interface MetadataValue {
    [propertyKey: string]: MetadataPropertyValue
}

export interface MetadataPropertyValue {
    joi?: Joi.Schema
    ref?: Schema
    'design:type'?: Function | Schema
    'design:paramtypes'?: Function[]
    'design:returntype'?: Function
}

export interface DecoratorBuilderOptions {
    required?: boolean
}
