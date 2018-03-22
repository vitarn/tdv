import { Schema, required, optional, createDecorater } from './'

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
})

describe('decorator', () => {
    describe('createDecorater', () => {
        it('create class decorator', () => {
            @((...args) => {
                return createDecorater((target, [one]) => {
                    target.prototype['mark'] = true
                }, args)
            })
            class Foo extends Schema { }

            expect(Foo.prototype['mark']).toBe(true)
        })

        it('create class decorator with args', () => {
            @((...args) => {
                return createDecorater((target, [one, two]) => {
                    target.prototype['one'] = one
                    target.prototype['two'] = two
                }, args)
            })(1, 2)
            class Foo extends Schema { }

            expect(Foo.prototype['one']).toBe(1)
            expect(Foo.prototype['two']).toBe(2)
        })

        it('create prop decorator', () => {
            class Foo extends Schema {
                @((...args) => {
                    return createDecorater((target, [one]) => {
                        target['mark'] = true
                    }, args)
                })
                bar
            }

            expect(Foo.prototype['mark']).toBe(true)
        })

        it('create prop decorator with args', () => {
            class Foo extends Schema {
                @((...args) => {
                    return createDecorater((target, key, desc, [one, two]) => {
                        target['one'] = one
                        target['two'] = two
                    }, args)
                })(1, 2)
                bar
            }

            expect(Foo.prototype['one']).toBe(1)
            expect(Foo.prototype['two']).toBe(2)
        })
    })
})
