import { Schema } from '../lib/schema'
import { required, optional, reference, createDecorator } from '../lib/decorator'

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

    describe('required', () => {
        it('write joi object into metadata', () => {
            class Foo extends Schema {
                @required id: string
            }

            expect(Foo.metadata.id['tdv:joi'].describe()).toEqual({
                type: 'string',
                label: 'id',
                invalids: [''],
                flags: {
                    presence: 'required',
                },
            })
        })
    })

    describe('optional', () => {
        it('write joi object into metadata', () => {
            class Foo extends Schema {
                @optional age: number
            }

            expect(Foo.metadata.age['tdv:joi'].describe()).toEqual({
                type: 'number',
                label: 'age',
                invalids: [Infinity, -Infinity],
                flags: {},
            })
        })
    })

    describe('reference', () => {
        class Bar extends Schema {}
        
        it('write type into metadata', () => {
            class Foo extends Schema {
                @reference({ type: Bar })
                bar: Bar
            }

            expect(Foo.metadata.bar['tdv:joi']).toBeUndefined()
            expect(Foo.metadata.bar['tdv:ref']).toBe(Bar)
        })
        
        it('write type array into metadata', () => {
            class Foo extends Schema {
                @reference({ type: [Bar] })
                bar: Bar[]
            }

            expect(Foo.metadata.bar['tdv:joi']).toBeUndefined()
            expect(Foo.metadata.bar['tdv:ref'][0]).toBe(Bar)
        })
    })
})
