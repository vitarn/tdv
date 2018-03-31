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

        it('understand scalar types', () => {
            class N extends Schema {
                @optional f: number
            }
            expect(N.metadata.f['tdv:joi'].describe()).toEqual({
                type: 'number',
                label: 'f',
                invalids: [Infinity, -Infinity],
                flags: {},
            })

            class NS extends Schema {
                @optional f: 0 | 1
            }
            expect(NS.metadata.f['tdv:joi'].describe()).toEqual({
                type: 'number',
                label: 'f',
                invalids: [Infinity, -Infinity],
                flags: {},
            })

            class S extends Schema {
                @optional f: string
            }
            expect(S.metadata.f['tdv:joi'].describe()).toEqual({
                type: 'string',
                label: 'f',
                invalids: [''],
                flags: {},
            })

            class SS extends Schema {
                @optional f: 'a' | 'b'
            }
            expect(SS.metadata.f['tdv:joi'].describe()).toEqual({
                type: 'string',
                label: 'f',
                invalids: [''],
                flags: {},
            })

            class B extends Schema {
                @optional f: boolean
            }
            expect(B.metadata.f['tdv:joi'].describe()).toEqual({
                type: 'boolean',
                label: 'f',
                truthy: [true],
                falsy: [false],
                flags: {
                    insensitive: true,
                },
            })

            class BS extends Schema {
                @optional f: true
            }
            expect(BS.metadata.f['tdv:joi'].describe()).toEqual({
                type: 'boolean',
                label: 'f',
                truthy: [true],
                falsy: [false],
                flags: {
                    insensitive: true,
                },
            })

            class FR extends Schema {
                @optional f: () => {}
            }
            expect(FR.metadata.f['tdv:joi'].describe()).toEqual({
                type: 'object',
                label: 'f',
                flags: {
                    func: true,
                },
            })
        })

        it('no understand objects', () => {
            const desc = {
                type: 'any',
                label: 'f',
                flags: {},
            }

            class NN extends Schema {
                @optional f: Number
            }
            expect(NN.metadata.f['tdv:joi'].describe()).toEqual(desc)

            class SS extends Schema {
                @optional f: String
            }
            expect(SS.metadata.f['tdv:joi'].describe()).toEqual(desc)

            class BB extends Schema {
                @optional f: Boolean
            }
            expect(BB.metadata.f['tdv:joi'].describe()).toEqual(desc)

            class F extends Schema {
                @optional f: Function
            }
            expect(F.metadata.f['tdv:joi'].describe()).toEqual(desc)

            class BF extends Schema {
                @optional f: Buffer
            }
            expect(BF.metadata.f['tdv:joi'].describe()).toEqual(desc)

            class BA extends Schema {
                @optional f: Int8Array
            }
            expect(BA.metadata.f['tdv:joi'].describe()).toEqual(desc)
        })
    })
})
