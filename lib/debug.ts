import { debuglog } from 'util'

let debug
try {
    debug = require('debug')
} catch (err) {
    debug = debuglog
}

/**
 * Create `debug` logger with `tdv:` prefix.
 * Fallback to `util.debuglog`
 */
export default (namespace: string) => debug(`tdv:${namespace}`)
