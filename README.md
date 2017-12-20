# webpack-isomorphic-compiler

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][codecov-image]][codecov-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url] [![Greenkeeper badge][greenkeeper-image]][greenkeeper-url]

[npm-url]:https://npmjs.org/package/webpack-isomorphic-compiler
[npm-image]:http://img.shields.io/npm/v/webpack-isomorphic-compiler.svg
[downloads-image]:http://img.shields.io/npm/dm/webpack-isomorphic-compiler.svg
[travis-url]:https://travis-ci.org/moxystudio/webpack-isomorphic-compiler
[travis-image]:http://img.shields.io/travis/moxystudio/webpack-isomorphic-compiler/master.svg
[codecov-url]:https://codecov.io/gh/moxystudio/webpack-isomorphic-compiler
[codecov-image]:https://img.shields.io/codecov/c/github/moxystudio/webpack-isomorphic-compiler/master.svg
[david-dm-url]:https://david-dm.org/moxystudio/webpack-isomorphic-compiler
[david-dm-image]:https://img.shields.io/david/moxystudio/webpack-isomorphic-compiler.svg
[david-dm-dev-url]:https://david-dm.org/moxystudio/webpack-isomorphic-compiler?type=dev
[david-dm-dev-image]:https://img.shields.io/david/dev/moxystudio/webpack-isomorphic-compiler.svg
[greenkeeper-image]:https://badges.greenkeeper.io/moxystudio/webpack-isomorphic-compiler.svg
[greenkeeper-url]:https://greenkeeper.io

A compiler that makes your life easier if you are building isomorphic [webpack](https://webpack.js.org/) powered apps, that is, single page applications with server-side rendering.


## Installation

`$ npm install webpack-isomorphic-compiler --save-dev`

The current version works with webpack v2 and v3.


## Motivation

With webpack, client-side applications with server-side rendering means compiling both the client and the server.   
To make it right, the client and server compilers must be in sync and live in perfect harmony.

Webpack offers a multi-compiler that makes this possible, but unfortunately it doesn't have all the plugin handlers that a single compiler does. This makes it difficult to know what's happening under the hood.

This module packs an aggregated compiler which syncs up the client & server compilation and:

- Has a clearer and saner API
- Warns about mistakes within your webpack configs
- Has 100% API compatibility with [webpack-sane-compiler](https://github.com/moxystudio/webpack-sane-compiler), allowing you to use its [reporter](https://github.com/moxystudio/webpack-sane-compiler-reporter) and [notifier](https://github.com/moxystudio/webpack-sane-compiler-notifier)

*NOTE*: While `webpack-sane-compiler-reporter` is compatible with this compiler, we advise using [webpack-isomorphic-compiler-reporter](https://github.com/moxystudio/webpack-isomorphic-compiler-reporter) instead for completeness and accurateness.


## Usage

```js
const webpack = require('webpack');
const isomorphicWebpack = require('webpack-isomorphic-compiler');

const clientCompiler = webpack(/* client config */);
const serverCompiler =  webpack(/* server config */);
const compiler = isomorphicWebpack(clientCompiler, serverCompiler);
```

Alternatively, you may pass a config directly instead of a webpack compiler:

```js
const webpack = require('webpack');

const compiler = isomorphicWebpack(/* client config */, /* server config */);
```

The returned `compiler` has exactly the same API as the [webpack-sane-compiler](https://github.com/moxystudio/webpack-sane-compiler) but adds some functionality that is detailed below.

### Compilation result

The compilation result, available through `.run()`, `.watch()`, `.getCompilation()` and `.resolve()`, has two more properties:

```js
compiler.run()
.then(({ clientStats, serverStats, stats, duration }) => {
    // clientStats is the webpack stats of the client
    // serverStats is the webpack stats of the client
    // duration is the aggregated compilation duration
    // stats maps to clientStats for API compatibility
})
```

### Client & server webpack

Both `client` and `server` properties contain their webpack configs & compilers.

| Name   | Description   | Type     |
| ------ | ------------- | -------- |
| webpackCompiler | The client's webpack compiler | [Compiler](https://github.com/webpack/webpack/blob/bd753567da1248624beaaea14af31d6dbe303411/lib/Compiler.js#L153) |
| webpackConfig | The client's webpack config | object |

Accessing webpack compiler public methods is NOT allowed and will throw an error.


## Related projects

You may also want to look at:

- [webpack-isomorphic-dev-middleware](https://github.com/moxystudio/webpack-isomorphic-dev-middleware): Like webpack-dev-middleware, but for isomorphic applications
- [webpack-isomorphic-compiler-reporter](https://github.com/moxystudio/webpack-isomorphic-compiler-reporter): Beautiful reporting for this compiler
- [webpack-sane-compiler-notifier](https://github.com/moxystudio/webpack-sane-compiler-notifier): Receive OS notifications for this compiler
- [webpack-sane-compiler](https://github.com/moxystudio/webpack-sane-compiler): A webpack compiler wrapper that provides a nicer API


## Tests

`$ npm test`   
`$ npm test -- --watch` during development


## License

[MIT License](http://opensource.org/licenses/MIT)
