import { Schema } from '../schema'
import { required, optional, createDecorator } from '../decorator'

describe('decorator', () => {
    describe('createDecorator', () => {
        it('create class decorator', () => {
            @((...args) => createDecorator((target, [one]) => {
                target.prototype['mark'] = true
            }, args))
            class Foo extends Schema { }

            expect(Foo.prototype['mark']).toBe(true)
        })

        it('create class decorator with args', () => {
            @((...args) => createDecorator((target, [one, two]) => {
                target.prototype['one'] = one
                target.prototype['two'] = two
            }, args))(1, 2)
            class Foo extends Schema { }

            expect(Foo.prototype['one']).toBe(1)
            expect(Foo.prototype['two']).toBe(2)
        })

        it('create prop decorator', () => {
            class Foo extends Schema {
                @((...args) => createDecorator((target, [one]) => {
                    target['mark'] = true
                }, args))
                bar
            }

            expect(Foo.prototype['mark']).toBe(true)
        })

        it('create prop decorator with args', () => {
            class Foo extends Schema {
                @((...args) => createDecorator((target, key, desc, [one, two]) => {
                    target['one'] = one
                    target['two'] = two
                }, args))(1, 2)
                bar
            }

            expect(Foo.prototype['one']).toBe(1)
            expect(Foo.prototype['two']).toBe(2)
        })
    })
})
