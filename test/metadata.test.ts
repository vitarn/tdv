import { Schema } from '../lib/schema'
import { required, optional } from '../lib/decorator'

describe('metadata', () => {
    describe('joi', () => {
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

        it('hold child schema type ref', () => {
            class Child extends Schema { }
            class Parent extends Schema {
                @optional f: Child
            }
            expect(Parent.metadata.f['tdv:joi']).toBeUndefined()
            expect(Parent.metadata.f['tdv:ref']).toBe(Child)
        })

        it('loss child schema type ref if order is wrong', () => {
            class Parent extends Schema {
                @optional f: Child
            }
            class Child extends Schema { }
            expect(Parent.metadata.f['tdv:joi'].describe()).toEqual({
                type: 'any',
                label: 'f',
                flags: {},
            })
            expect(Parent.metadata.f['tdv:ref']).toBeUndefined()
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

        it('no understand complex types', () => {
            const desc = {
                type: 'any',
                label: 'f',
                flags: {},
            }

            class SA extends Schema {
                @optional f: string[]
            }
            expect(SA.metadata.f['tdv:joi'].describe()).toEqual(desc)

            class Child extends Schema { }
            class Parent extends Schema {
                @optional f: Child[]
            }
            expect(Parent.metadata.f['tdv:joi'].describe()).toEqual(desc)
            expect(Parent.metadata.f['tdv:ref']).toBeUndefined()
        })

        it('no understand union types', () => {
            const desc = {
                type: 'any',
                label: 'f',
                flags: {},
            }

            class SoN extends Schema {
                @optional f: string | number
            }
            expect(SoN.metadata.f['tdv:joi'].describe()).toEqual(desc)
        })
    })
})
