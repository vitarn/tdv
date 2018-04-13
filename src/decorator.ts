import debug from './debug'
import 'reflect-metadata'
import Joi from 'joi'
import { Schema } from './schema'

const log = debug('decorator')

/**
 * Inspire from core-decorators
 * 
 * @see https://github.com/jayphelps/core-decorators/blob/master/src/private/utils.js
 */
export function createDecorator(handleDescriptor: HandleDescriptor, entryArgs: any[]) {
    const [target] = entryArgs

    if (target instanceof Schema) {
        // @propertyDecorator
        return (handleDescriptor as any)(...entryArgs, [])
    } else if (Schema.isPrototypeOf(target)) {
        // @classDecorator
        return (handleDescriptor as any)(target, [])
    } else {
        // @propertyDecorator(...args)
        return function () {
            return (handleDescriptor as any)(...Array.prototype.slice.call(arguments), entryArgs)
        }
    }
}

const fieldDescriptor: ((opts?) => HandleDescriptor) = (opts = {}) => (target, key, desc, [fn]) => {
    log('handleDescriptor', opts, target, key, desc, fn)

    Reflect.defineMetadata(`tdv:key:${key}`, true, target)

    const designType = Reflect.getOwnMetadata('design:type', target, key)

    if (Schema.isPrototypeOf(designType)) {
        Reflect.defineMetadata('tdv:ref', designType, target, key)
        return
    }

    const joi = (fn ? fn(Schema.Joi) as Joi.Schema : designTypeToJoiSchema(designType))
        .label(key.toString())

    Reflect.defineMetadata('tdv:joi', opts.required ? joi.required() : joi, target, key)
}

function designTypeToJoiSchema(designType: Function) {
    log('parse design:type', designType)

    switch (designType) {
        case Number:
            return Schema.Joi.number()
        case String:
            return Schema.Joi.string()
        case Boolean:
            return Schema.Joi.boolean()
        case Array:
            return Schema.Joi.array()
        // arrow function, another functions is Object.
        case Function:
            return Schema.Joi.func()
        // FIXME: this not works bcs Date and Buffer are Object.
        // case Date:
        // return Schema.Joi.date()
        // case Buffer:
        // return Schema.Joi.binary()
        default:
            return Schema.Joi.any()
    }
}

/**
 * Required field decorator of schema
 * 
 * @example
 * 
 *  class Example {
 *      @required name: string
 *      @required(Joi => Joi.string()) name: string
 *  }
 */
export const required: FlexibleDecorator<JoiBuilder> = (...args) => {
    return createDecorator(fieldDescriptor({ required: true }), args)
}

/**
 * Optional field decorator of schema
 * 
 * @example
 * 
 *  class Example {
 *      @optional name?: string
 *      @optional(Joi => Joi.string()) name?: string
 *  }
 */
export const optional: FlexibleDecorator<JoiBuilder> = (...args) => {
    return createDecorator(fieldDescriptor(), args)
}

const referenceDescriptor: HandleDescriptor = (target, key, desc, [opts = {}]) => {
    log('handleDescriptor', target, key, desc, opts)

    if (opts.type) {
        Reflect.defineMetadata('tdv:ref', opts.type, target, key)
        Reflect.defineMetadata(`tdv:key:${key}`, true, target)
        // metadataFor(target, key)['tdv:ref'] = opts.type
    }
}

/**
 * Reference field decorator of schema
 * 
 * @example
 * 
 *  class Example {
 *      @reference([Child]) children: Child[]
 *  }
 */
export const reference: FlexibleDecorator<{ type: any }> = (...args) => {
    return createDecorator(referenceDescriptor, args)
}

/* TYPES */

export type HandleDescriptor = ((target: Object, key: string | symbol, desc: PropertyDescriptor, args: any[]) => any)
    | ((target: Function, args: any[]) => any)

export type JoiBuilder = (Joi: Joi.Root) => Joi.Schema

export type FlexibleDecorator<T> = (target?: Object | T, key?: string | symbol, desc?: PropertyDescriptor, args?: any[]) => any
