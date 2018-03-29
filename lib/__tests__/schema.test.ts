import { Schema } from '../schema'
import { required, optional, createDecorator } from '../decorator'

describe('Schema', () => {
    describe('merged metadata', () => {
        class FirstSchema extends Schema {
            @required(Joi => Joi.string().uuid({ version: 'uuidv4' }))
            id: string

            @optional(j => j.string())
            name?: string
        }

        class SecondSchema extends FirstSchema {

        }

        class ThirdSchema extends SecondSchema {
            @required(j => j.string().min(5).max(40))
            name: string

            @optional(j => j.number().min(1).max(199))
            age?: number

            @optional
            active?: boolean
        }

        it('has no metadata in Schema', () => {
            expect(Object.keys(Schema.metadata)).toEqual([])
        })

        it('have metadatas in FirstSchema', () => {
            expect(Object.keys(FirstSchema.metadata)).toEqual(['id', 'name'])
        })

        it('have metadatas in SecondSchema same as FirstSchema', () => {
            expect(Object.keys(SecondSchema.metadata)).toEqual(['id', 'name'])
        })

        it('have metadatas in ThirdSchema', () => {
            expect(Object.keys(ThirdSchema.metadata)).toEqual(['id', 'name', 'age', 'active'])
        })
    })

    describe('toJSON', () => {
        class User extends Schema {
            @required id: number
            @required profile: Profile
        }

        class Profile extends Schema {
            @required name: string
        }

        it('output json include refs', () => {
            let user = new User({
                id: 1,
                profile: new Profile({ name: 'Joe' })
            })

            expect(user.toJSON()).toEqual({
                id: 1,
                profile: {
                    name: 'Joe',
                },
            })
        })
    })

    describe('validate', () => {
        class Profile extends Schema {
            @required(j => j.string())
            name: string
        }

        class User extends Schema {
            @required(j => j.number())
            id: number

            @required
            profile: Profile
        }

        it('contain error if invalid', () => {
            let user = new User({ id: 'abc', profile: new Profile({ name: 'Joe' }) })

            expect(user.validate().error).toBeTruthy()
        })

        it('return null error if valid', () => {
            let user = new User({ id: '123', profile: new Profile({ name: 'Joe' }) })

            expect(user.validate().error).toBeNull()
        })
    })

    describe('attempt', () => {
        class Profile extends Schema {
            @required(j => j.string())
            name: string
        }

        class User extends Schema {
            @required(j => j.number())
            id: number

            @required
            profile: Profile
        }

        it('throw error if invalid', () => {
            let user = new User({ id: 'abc', profile: new Profile({ name: 'Joe' }) })

            expect(() => user.attempt()).toThrow()
        })

        it('return json if valid', () => {
            let user = new User({ id: '123', profile: new Profile({ name: 'Joe' }) })

            expect(user.attempt()).toEqual({
                id: 123,
                profile: {
                    name: 'Joe',
                },
            })
        })
    })

    describe('joi rewrite', () => {
        class Foo extends Schema {
            @optional(j => j.number().default(() => 1, '1'))
            age: number
        }

        it('default', () => {
            expect(new Foo().attempt().age).toBe(1)
        })
    })

    describe('without joi', () => {
        class Foo extends Schema {
            @((...args) => createDecorator((target, [one]) => {
                target['mark'] = true
            }, args))
            age: number
        }

        it('attempt', () => {
            expect(() => new Foo().attempt()).not.toThrow()
        })
    })
})
