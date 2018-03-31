import Joi, { Root } from '../joi'

describe('Joi', () => {
    describe('Proxy', () => {
        // interface FieldStatic extends Root {
        //     new (): this
        // }
        let field = new Proxy<Root>(Joi as any, {
            // construct(target, args, newTarget) {
            //     console.log(target, args, newTarget)
            //     return field
            // },

            get(target, p, receiver) {
                this.j = this.j || target

                return (...args) => {
                    this.j = Reflect.get(this.j, p, this.j)(...args)
                }
            },
        })

        console.log(field.string())
        // console.log(field.string().validate('a'))

        it('', () => {

        })
    })
})
