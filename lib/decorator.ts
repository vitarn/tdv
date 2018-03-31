import debug from './debug'
import Joi from 'joi'
import { metadataFor } from './metadata'
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

const fieldDescriptor: ((opts?) => HandleDescriptor) = (opts = {}) => (target, key, desc, [fn] = []) => {
    log('handleDescriptor', opts, target, key, desc, fn)
    const property = metadataFor(target, key)

    let joi

    if (typeof fn === 'function') {
        joi = fn(Joi)
    } else {
        const designType = property['design:type'] as Function

        if (Schema.isPrototypeOf(designType)) {
            property['tdv:ref'] = designType
            return
        } else {
            joi = designTypeToJoiSchema(designType)
        }
    }

    if (opts.required && joi && typeof joi.required === 'function') {
        joi = joi.required()
    }
    property['tdv:joi'] = joi.label(key)
}

function designTypeToJoiSchema(designType: Function) {
    log('parse design:type', designType)
    switch (designType) {
        case Number:
            return Joi.number()
        case String:
            return Joi.string()
        case Boolean:
            return Joi.boolean()
        // only arrow function type, Function is Object
        case Function:
            return Joi.func()
        // FIXME: this not works bcs Buffer is Object
        case Buffer:
            return Joi.binary()
        default:
            return Joi.any()
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

/* TYPES */

export type HandleDescriptor = ((target: Object, key: string | symbol, desc: PropertyDescriptor, args: any[]) => any)
    | ((target: Function, args: any[]) => any)

export type JoiBuilder = (Joi: Joi.Root) => Joi.Schema

export type FlexibleDecorator<T> = (target?: Object | T, key?: string | symbol, desc?: PropertyDescriptor, args?: any[]) => any
