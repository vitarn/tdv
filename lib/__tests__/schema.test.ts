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

    describe('constructor', () => {
        class Profile extends Schema {
            @required
            name: string

            @optional(j => j.number().default(1))
            age?: number
        }

        class User extends Schema {
            @required
            id: string

            @required
            profile: Profile
        }

        it('have 3 ways init a Schema', () => {
            const props = {
                id: '1',
                profile: {
                    name: 'foo'
                }
            }
            const newUser = new User(props)
            const buildUser = User.build(props)
            const parseUser = new User().parse(props)

            expect(newUser.profile).toBeInstanceOf(Profile)
            expect(newUser.profile.age).toBe(1)

            expect(buildUser).toEqual(newUser)
            expect(parseUser).toEqual(newUser)
        })
    })

    describe('parse', () => {
        class Address extends Schema {
            @optional
            province?: string

            @optional
            city?: string
        }

        // WARN: If put Profile late than User. User#profile design:type is undefined
        class Profile extends Schema {
            @required
            name: string

            @optional(j => j.number().default(1))
            age?: number

            @optional
            address?: Address
        }

        class User extends Schema {
            @required
            id: string

            @required
            profile: Profile
        }

        it('parse object and init child', () => {
            const user = new User().parse({
                id: '1',
                profile: {
                    name: 'foo',
                    age: 10,
                    address: {
                        province: 'gz',
                        city: 'sz',
                    },
                },
            })

            expect(user.profile).toBeInstanceOf(Profile)
            expect(user.profile.address).toBeInstanceOf(Address)
            expect(user.profile.address.city).toBe('sz')
        })

        it('skip child if not provide props', () => {
            const user = new User().parse({
                id: '1',
                profile: {
                    name: 'foo',
                },
            })

            expect(user.profile.address).toBeUndefined()
        })

        it('accept child instance', () => {
            const address = new Address()
            const user = new User().parse({
                id: '1',
                profile: {
                    name: 'foo',
                    address,
                },
            })

            expect(user.profile.address).toBe(address)
        })

        it('leave null for child', () => {
            expect(new User().parse({
                id: '1',
                profile: {
                    name: 'foo',
                    address: null,
                },
            }).profile.address).toBeNull()
        })

        it('leave undefined for child', () => {
            expect(new User().parse({
                id: '1',
                profile: {
                    name: 'foo',
                    address: undefined,
                },
            }).profile.address).toBeUndefined()
        })

        it('init child even props is empty', () => {
            expect(new User().parse({
                id: '1',
                profile: {
                    name: 'foo',
                    address: {},
                },
            }).profile.address).toBeInstanceOf(Address)
        })

        it('fallback to joi default value', () => {
            const user = new User().parse({
                id: '1',
                profile: {
                    name: 'foo',
                },
            })

            expect(user.profile.age).toBe(1)
        })

        it('cast value type by joi', () => {
            const user = new User().parse({
                id: '1',
                profile: {
                    name: 'foo',
                    age: ' 10 ' as any,
                },
            })

            expect(user.profile.age).toBe(10)
        })

        it('leave wrong type value there', () => {
            const user = new User().parse({
                id: '1',
                profile: {
                    name: 'foo',
                    age: '10y' as any,
                },
            })

            expect(user.profile.age).toBe('10y')
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
            @optional(j => j.string())
            name?: string

            @optional(j => j.number().default(1))
            age?: number
        }

        class User extends Schema {
            @required(j => j.number())
            id: number

            @optional
            profile?: Profile
        }

        it('contain error if invalid', () => {
            let user = new User({ id: 'abc', profile: new Profile({ name: 'Joe' }) })

            expect(user.validate().error).toBeTruthy()
        })

        it('without error if valid', () => {
            let user = new User({ id: '123', profile: new Profile({ name: 'Joe' }) })

            expect(user.validate().error).toBeNull()
        })
        
        it('return joi default', () => {
            let user = new User({ id: '1', profile: new Profile() })

            expect(user.validate().value.profile.age).toBe(1)
        })

        it('mutable validate', () => {
            let user = new User({ id: '1', profile: new Profile() })
            expect(user.profile.age).toBe(1)

            user.profile.age = undefined
            expect(user.validate().value.profile.age).toBe(1)
            expect(user.profile.age).toBeUndefined()

            user.validate({ apply: true })
            expect(user.profile.age).toBe(1)
        })
    })

    describe('attempt', () => {
        class Profile extends Schema {
            @optional(j => j.string())
            name?: string

            @optional(j => j.number().default(1))
            age?: number
        }

        class User extends Schema {
            @required(j => j.number())
            id: number

            @optional
            profile?: Profile
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
                    age: 1,
                },
            })
        })

        it('mutable attempt', () => {
            let user = new User({ id: '1', profile: new Profile() })
            expect(user.profile.age).toBe(1)

            user.profile.age = undefined
            expect(user.attempt().profile.age).toBe(1)
            expect(user.profile.age).toBeUndefined()

            user.attempt({ apply: true })
            expect(user.profile.age).toBe(1)
        })
    })

    describe('joi default', () => {
        class Foo extends Schema {
            @optional(j => j.number().default(() => 1, '1'))
            age: number
        }

        class Bar extends Foo {
            @optional(j => j.number().default(() => 2, '2'))
            height: number
        }

        it('has default value', () => {
            expect(new Foo(({ age: undefined })).attempt().age).toBe(1)
        })

        it('has default value in sub class', () => {
            expect(new Foo().attempt()).toEqual({ age: 1 })
            expect(new Bar().attempt()).toEqual({ age: 1, height: 2 })
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
