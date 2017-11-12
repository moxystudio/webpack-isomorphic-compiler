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

Webpack offers a multi-compiler that makes this easier, but unfortunately it doesn't have all the plugin handlers that a single compiler does. This makes it difficult to know what's happening under the hood.

This module packs an aggregated compiler which syncs up the client & server compilation and:

- Has a clearer and saner API
- Warns about mistakes within your webpack configs
- Has [beautiful](http://i.imgur.com/rgy7QcT.gif) [reporting](#reporter)


## API

**webpackIsomorphicCompiler(clientCompiler, serverCompiler)**

Creates an aggregated compiler that wraps both client and server webpack compilers.   

```js
const webpack = require('webpack');
const webpackIsomorphicCompiler = require('webpack-isomorphic-compiler');

const clientCompiler = webpack(/* client config */);
const serverCompiler =  webpack(/* server config */);
const compiler = webpackIsomorphicCompiler(clientCompiler, serverCompiler);
```

Alternatively, you may pass a config directly instead of a webpack compiler:

```js
const webpack = require('webpack');

const compiler = webpackIsomorphicCompiler(/* client config */, /* server config */);
```

The compiler inherits from [EventEmitter](https://nodejs.org/api/events.html) and emits the following events:

| Name   | Description   | Argument |
| ------ | ------------- | -------- |
| begin | Emitted when a compilation starts | |
| error | Emitted when the compilation fails | err |
| end | Emitted when the compilation completes successfully | stats |

```js
compiler
.on('begin', () => console.log('Compilation started'))
.on('end', (stats) => {
    console.log('Compilation finished successfully');
    console.log('Client stats', stats.client);
    console.log('Server stats', stats.server);
})
.on('error', (err) => {
    console.log('Compilation failed')
    console.log(err.message);
    console.log(err.stats.toString());
})
```

### .run([options])

Compiles both the client & server.   
Returns a promise that fulfills with a `stats` object or is rejected with an error.

This is similar to webpack's run() method, except that it returns a promise which gets rejected if stats contains errors.

```js
compiler.run()
.then((stats) => {
    // stats = {
    //   client,
    //   server,
    // }
})
.catch((err) => {
    // err = {
    //   message: 'Error message',
    //   [stats]: <webpack-stats>
    // }
});
```

Available options:

| Name   | Description   | Type     | Default  |
| ------ | ------------- | -------- | -------- |
| report | Enable reporting | boolean/[object](#reporter) | false |

### .watch([options], [handler])

Starts watching for changes and compiles on-the-fly.   
Returns itself to allow chaining.

Calls `handler` everytime the compilation fails or succeeds.
This is similar to webpack's watch() method, except that `handler` gets called with an error if stats contains errors.

Available options:

| Name   | Description   | Type     | Default |
| ------ | ------------- | -------- | ------- |
| poll | Use polling instead of native watchers | boolean | false |
| aggregateTimeout | Wait so long for more changes (ms) | err | 200 |
| report | Enable reporting | boolean/[object](#reporter) | false |

```js
compiler.watch((err, stats) => {
    // err = {
    //   message: 'Error message',
    //   [stats]: <webpack-stats>
    // }
    // stats = {
    //   client,
    //   server,
    // }
});
```

### .unwatch()

Stops watching for changes.   
Returns a promise that fulfills when done.


### .resolve()

Resolves the compiler result.

The promise gets immediately resolved if the compiler has finished or failed.  
Otherwise waits for a compilation to be done before resolving the promise.

```js
compiler.resolve()
.then((stats) => {
    // stats = {
    //   client,
    //   server,
    // }
})
.catch((err) => {
    // err = {
    //   message: 'Error message',
    //   [stats]: <webpack-stats>
    // }
});
```


### .isCompiling()

Returns a boolean indicating if the code is being compiled.


### .getError()

Returns the compilation error or null if none.


### .getStats()

Returns the compilation stats object (`{ client, server }`) or null if it failed or not yet available.


### Client & server webpack related properties

Both `client` and `server` properties contain their webpack configs & compilers.

| Name   | Description   | Type     |
| ------ | ------------- | -------- |
| webpackCompiler | The client's webpack compiler | [Compiler](https://github.com/webpack/webpack/blob/bd753567da1248624beaaea14af31d6dbe303411/lib/Compiler.js#L153) |
| webpackConfig | The client's webpack config | object |

Accessing webpack compiler public methods is NOT allowed and will throw an error.


### Reporter

Both `run()` and `watch()` accepts a `report` option that, when enabled, prints information related to the compilation process.
The option can be a boolean or an object that maps to the following options:

| Name   | Description   | Type     | Default |
| ------ | ------------- | -------- | ------- |
| humanErrors | Detects human errors related to webpack configuration mistakes | boolean | true |
| stats | Display webpack stats after each successful compilation | boolean/string (true, false or `once`) | true |
| statsOptions | Which stats to display, see [stats.toString()](https://webpack.js.org/api/node/#stats-object) | [sane default](https://github.com/moxystudio/webpack-isomorphic-compiler/blob/3f572a471fcd6632964471ccf201bb3da348ed40/lib/reporter.js#L83) |

Additionally, you may use the reporter manually through the exported `reporter` function on the `webpack-isomorphic-compiler` module.


## Tests

`$ npm test`   
`$ npm test:watch` during development


## License

[MIT License](http://opensource.org/licenses/MIT)
