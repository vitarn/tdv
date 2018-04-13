import { Schema } from '../src/schema'
import { required, optional } from '../src/decorator'

describe('metadata', () => {
    const anyDescribe = {
        type: 'any',
        flags: {},
    }

    describe('joi', () => {
        class Bar extends Schema {}
        class Foo extends Schema {
            @optional n: number
            @optional un: 0 | 1
            @optional s: string
            @optional us: 'a' | 'b'
            @optional a: string[]
            @optional b: boolean
            @optional bv: true
            @optional rf: () => {}

            @optional N: Number
            @optional S: String
            @optional B: Boolean
            @optional D: Date
            @optional BF: Buffer
            @optional BA: Int8Array
            @optional F: Function
            @optional bars: Bar[]

            @optional hu: number | string
        }
        const getDescribe = key => Reflect.getMetadata('tdv:joi', Foo.prototype, key).describe()
        /**
         * Test macro similar ava
         * 
         * @see https://github.com/facebook/jest/issues/2249#issuecomment-265573281
         */
        const macro = (field, joiDescribe) => {
            expect(getDescribe(field)).toMatchObject(joiDescribe)
        }

        for (let opts of [
            ['number', 'n', { type: 'number', invalids: [Infinity, -Infinity] }],
            ['union number', 'un', { type: 'number', invalids: [Infinity, -Infinity] }],
            ['string', 's', { type: 'string', invalids: [''] }],
            ['union string', 'us', { type: 'string', invalids: [''] }],
            ['array', 'a', { type: 'array', flags: { sparse: false } }],
            ['Class[]', 'bars', { type: 'array', flags: { sparse: false } }],
            ['boolean', 'b', { type: 'boolean', truthy: [true], falsy: [false], flags: { insensitive: true } }],
            ['boolean true', 'bv', { type: 'boolean', truthy: [true], falsy: [false], flags: { insensitive: true }}],
            ['arrow function', 'rf', { type: 'object', flags: { func: true } }],
        ]) {
            const [type, ...args] = opts
            it(`understand ${type}`, macro.bind(this, ...args))
        }

        for (let opts of [
            ['Number', 'N', anyDescribe],
            ['String', 'S', anyDescribe],
            ['Boolean', 'B', anyDescribe],
            ['Date', 'D', anyDescribe],
            ['Buffer', 'BF', anyDescribe],
            ['Int8Array', 'BA', anyDescribe],
            ['Function', 'F', anyDescribe],
            ['hybrid union', 'hu', anyDescribe],
        ]) {
            const [type, ...args] = opts
            it(`dont know ${type}`, macro.bind(this, ...args))
        }
    })

    describe('ref', () => {
        it('hold child schema type ref', () => {
            class Child extends Schema { }
            class Parent extends Schema {
                @optional f: Child
            }

            expect(Reflect.getMetadata('tdv:joi', Parent.prototype, 'f')).toBeUndefined()
            expect(Reflect.getMetadata('tdv:ref', Parent.prototype, 'f')).toBe(Child)
        })

        it('loss child schema type ref if order is wrong', () => {
            class Parent extends Schema {
                @optional f: Child
            }
            class Child extends Schema { }

            expect(Reflect.getMetadata('tdv:joi', Parent.prototype, 'f').describe()).toMatchObject(anyDescribe)
            expect(Reflect.getMetadata('tdv:ref', Parent.prototype, 'f')).toBeUndefined()
        })
    })
})
