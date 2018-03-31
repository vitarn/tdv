import { Root } from 'joi'

let Joi: Root
try {
    Joi = require('joi').defaults(s => s)
} catch (err) {
    Joi = {} as Root
}

export default Joi
export * from 'joi'
