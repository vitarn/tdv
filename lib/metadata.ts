import debug from './debug'

const log = debug('metadata')

const key = Symbol.for('__metadata__')

/**
 * Get metadata for target class
 * If property key provided return metadata for special property
 * @param target `prototype` of class function
 * @param propertyKey class property key
 */
export function metadataFor(target: Object, propertyKey?: string | symbol) {
    if (target.hasOwnProperty(key) === false) {
        Object.defineProperty(target, key, {
            // Defaults: NOT enumerable, configurable, or writable
            value: {}
        })
    }

    if (propertyKey) {
        return target[key][propertyKey] = target[key][propertyKey] || {}
    }

    return target[key]
}

/**
 * Reflect.metadata
 * Typescript emit `__metadata` into decorators array. Then try invoke this.
 * It's good chance return a new decorator.
 * 
 * @example
 *      tsconfig.json
 *      { "emitDecoratorMetadata": true }
 * 
 * @see http://nicholasjohnson.com/blog/how-angular2-di-works-with-typescript/
 */
Object.assign(Reflect, {
    metadata: (metaKey: string, metaValue: any) => {
        const decorator: PropertyDecorator = (target, propertyKey) => {
            log('@__metadata', target, propertyKey, metaKey, metaValue)
            const metadata = metadataFor(target)
            metadata[propertyKey] = metadata[propertyKey] || {}
            metadata[propertyKey][metaKey] = metaValue
        }

        return decorator
    }
})
