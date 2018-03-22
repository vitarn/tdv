import Joi from 'joi'
import { metadataFor } from './metadata'
import { log } from './log'

export class Schema {
    static get metadata(): Metadata {
        const metadatas = []
        let proto = this.prototype
        do {
            metadatas.unshift(metadataFor(proto) || {})
        } while (proto = Object.getPrototypeOf(proto))

        return Object.assign({}, ...metadatas)
    }

    static get validator() {
        const metadata = this.metadata
        const schema = Object.keys(metadata).reduce((obj, key) => {
            log('push field %s into validator', key)
            obj[key] = metadata[key]['tdv:joi'] || metadata[key]['tdv:ref']['validator']
            return obj
        }, {})

        return Joi.object(schema)
    }

    constructor(props = {}) {
        Object.assign(this, props)
    }

    validate() {
        const validator: Joi.Schema = this.constructor['validator']

        return validator.validate(this.toJSON())
    }

    attempt() {
        const validator: Joi.Schema = this.constructor['validator']

        return Joi.attempt(this.toJSON(), validator)
    }

    toJSON(): { [key: string]: any } {
        const metadata: Metadata = this.constructor['metadata']

        if (!metadata) return {}

        const obj = {}
        for (let key of Object.keys(metadata)) {
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

export interface Metadata {
    [propertyKey: string]: MetadataProperty
}

export interface MetadataProperty {
    'design:type'?: Function | Schema
    'design:paramtypes'?: Function[]
    'design:returntype'?: Function

    'tdv:joi'?: Joi.Schema
    'tdv:ref'?: Schema
}
