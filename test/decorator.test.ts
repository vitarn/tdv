import { Schema } from '../src/schema'
import { required, optional, reference, createDecorator } from '../src/decorator'

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
        class Foo extends Schema {
            @required id: string
        }

        class Bar extends Foo {}

        it('write joi object into metadata', () => {
            expect(Reflect.getOwnMetadata('tdv:joi', Foo.prototype, 'id').describe()).toEqual({
                type: 'string',
                label: 'id',
                invalids: [''],
                flags: {
                    presence: 'required',
                },
            })
        })

        it('get joi metadata from sub class', () => {
            expect(Reflect.getMetadata('tdv:joi', Bar.prototype, 'id').describe()).toEqual({
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
        class Foo extends Schema {
            @optional age: number
        }

        it('write joi object into metadata', () => {
            expect(Reflect.getMetadata('tdv:joi', Foo.prototype, 'age').describe()).toEqual({
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

            expect(Reflect.getMetadata('tdv:joi', Foo.prototype, 'bar')).toBeUndefined()
            expect(Reflect.getMetadata('tdv:ref', Foo.prototype, 'bar')).toBe(Bar)
        })
        
        it('write type array into metadata', () => {
            class Foo extends Schema {
                @reference({ type: [Bar] })
                bars: Bar[]
            }

            expect(Reflect.getMetadata('tdv:joi', Foo.prototype, 'bar')).toBeUndefined()
            expect(Reflect.getMetadata('tdv:ref', Foo.prototype, 'bars')).toEqual([Bar])
        })
    })
})
