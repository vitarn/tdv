# tdv

[![Greenkeeper badge](https://badges.greenkeeper.io/vitarn/tdv.svg)](https://greenkeeper.io/)

Typescript (definition|decorator) validator base on Joi

[![License][ico-license]][link-license]
[![NPM][ico-npm]][link-npm]
[![Build Status][ico-build]][link-build]
[![Coverage Status][ico-codecov]][link-codecov]

## Example

`tsconfig.json`
```json
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
    },
}
```

```ts
import { Schema, required, optional } from 'tdv'

class User extends Schema {
    @required
    id: number

    @required(Joi => Joi.string().email())
    email: string

    @required
    profile: Profile
}

class Profile extends Schema {
    @optional
    displayName?: string
}

const user = new User({ id: 123, email: 'foo@example.com', profile: { displayName: 'Joe' } })

console.log(user.validate())
{ error: null,
    value: { id: 123, email: 'foo@example.com', profile: { displayName: 'Joe' } },
    then: [Function: then],
    catch: [Function: catch] }

console.log(user.attempt())
{ id: 123, email: 'foo@example.com', profile: { displayName: 'Joe' } }

console.log(user.toJSON())
{ id: 123, email: 'foo@example.com', profile: { displayName: 'Joe' } }

const user2 = new User({})

console.log(user2.validate())
{ error:
        { ValidationError: child "id" fails because ["id" is required]
        at error stack...
        isJoi: true,
        name: 'ValidationError',
        details: [ [Object] ],
        _object: { id: undefined, profile: undefined },
        annotate: [Function] },
    value: { id: undefined, profile: undefined },
    then: [Function: then],
    catch: [Function: catch] }

console.log(user.attempt())
{ ValidationError: {
    "id" [1]: -- missing --
    }

    [1] "id" is required
        at error stack...
    isJoi: true,
    name: 'ValidationError',
    details:
        [ { message: '"id" is required',
            path: [Array],
            type: 'any.required',
            context: [Object] } ],
    _object: { id: undefined, profile: undefined },
    annotate: [Function] }

console.log(user.toJSON())
{ id: undefined, profile: undefined }
```

[ico-license]: https://img.shields.io/github/license/vitarn/tdv.svg
[ico-npm]: https://img.shields.io/npm/v/tdv.svg
[ico-build]: https://travis-ci.org/vitarn/tdv.svg?branch=master
[ico-codecov]: https://codecov.io/gh/vitarn/tdv/branch/master/graph/badge.svg

[link-license]: ./blob/master/LICENSE
[link-npm]: https://www.npmjs.com/package/tdv
[link-build]: https://travis-ci.org/vitarn/tdv
[link-codecov]: https://codecov.io/gh/vitarn/tdv
