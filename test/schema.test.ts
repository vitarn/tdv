import Joi from 'joi'
import { Schema } from '../lib/schema'
import { required, optional, reference, createDecorator } from '../lib/decorator'

describe('Schema', () => {
    describe('Joi', () => {
        it('use a copy version Joi', () => {
            expect(Schema.Joi).not.toBe(Joi)
        })
    })

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

        it('new plain instance', () => {
            const profile = new Profile()
            expect('name' in profile).toBe(false)
            expect('age' in profile).toBe(false)
        })

        it('new default instance', () => {
            const profile = new Profile({})
            expect('name' in profile).toBe(true)
            expect('age' in profile).toBe(true)
            expect(profile.name).toBeUndefined()
            expect(profile.age).toBe(1)
        })

        it('new empty instance', () => {
            const profile = new Profile({}, { convert: false })
            expect('name' in profile).toBe(true)
            expect('age' in profile).toBe(true)
            expect(profile.name).toBeUndefined()
            expect(profile.age).toBeUndefined()
        })

        it('have 3 ways instance Schema with props', () => {
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

            expect(buildUser).toEqual(newUser)
            expect(parseUser).toEqual(newUser)
        })
    })

    describe('parse', () => {
        class Pet extends Schema {
            @optional
            name?: string
        }

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

            @optional
            profile?: Profile

            @reference({ type: [Pet] })
            pets?: Pet[]
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

        it('apply joi default value', () => {
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

        it('correct handle Schema[] type', () => {
            expect(new User().parse({
                id: '1',
                pets: [{ name: 'qq' }]
            }).pets[0].name).toBe('qq')

            expect(new User().parse({
                id: '1',
                pets: [{ name: 'qq' }]
            }).pets[0]).toBeInstanceOf(Pet)

            let pet = new Pet({ name: 'qq' })
            expect(new User().parse({
                id: '1',
                pets: [pet]
            }).pets[0]).toBe(pet)
        })
    })

    describe('toJSON', () => {
        class Pet extends Schema {
            @optional name?: string
        }

        class Profile extends Schema {
            @required name: string
        }

        class User extends Schema {
            @required id: number
            @required profile: Profile
            @reference({ type: [Pet] })
            pets?: Pet[]
        }

        it('output json include refs', () => {
            let profile = new Profile({ name: 'Joe' })
            let pet = new Pet({ name: 'qq' });
            (pet as any).bad = true
            let user = new User({
                id: 1,
                profile,
                pets: [pet],
            })

            expect(user.toJSON()).toEqual({
                id: 1,
                profile: {
                    name: 'Joe',
                },
                pets: [{
                    name: 'qq',
                }],
            })
        })
    })

    describe('validate', () => {
        class Pet extends Schema {
            @optional name?: string
        }

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

            @reference({ type: [Pet] })
            pets?: Pet[]
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

        it('apply validate value', () => {
            let user = User.build({ id: 1, profile: new Profile() }, { convert: false })
            expect(user.validate().value.profile.age).toBe(1)
            expect(user.profile.age).toBeUndefined()

            user.validate({ apply: true })
            expect(user.profile.age).toBe(1)
        })

        it('raise error if invalid', () => {
            let user = new User({ id: 'abc', profile: new Profile({ name: 'Joe' }) })

            expect(() => user.validate({ raise: true })).toThrow()
        })

        it('return json if valid', () => {
            let user = new User({ id: '123', profile: new Profile({ name: 'Joe' }) })

            expect(user.validate({ raise: true }).value).toEqual({
                id: 123,
                profile: {
                    name: 'Joe',
                    age: 1,
                },
            })
        })

        it('validate Child[] type', () => {
            expect(new User({
                id: 1,
                pets: [{ name: 'qq' }]
            }).validate().error).toBeNull()
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
            expect(new Foo(({ age: undefined })).validate().value.age).toBe(1)
        })

        it('has default value in sub class', () => {
            expect(new Foo().validate().value).toEqual({ age: 1 })
            expect(new Bar().validate().value).toEqual({ age: 1, height: 2 })
        })
    })

    describe('without joi', () => {
        class Foo extends Schema {
            @((...args) => createDecorator((target, [one]) => {
                target['mark'] = true
            }, args))
            age: number
        }

        it('validate no error', () => {
            expect(new Foo().validate().error).toBeNull()
        })
    })
})
