# webpack-isomorphic-compiler

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][codecov-image]][codecov-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]

[npm-url]:https://npmjs.org/package/webpack-isomorphic-compiler
[npm-image]:http://img.shields.io/npm/v/webpack-isomorphic-compiler.svg
[downloads-image]:http://img.shields.io/npm/dm/webpack-isomorphic-compiler.svg
[travis-url]:https://travis-ci.org/moxystudio/webpack-isomorphic-compiler
[travis-image]:http://img.shields.io/travis/moxystudio/webpack-isomorphic-compiler/master.svg
[codecov-url]:https://codecov.io/gh/moxystudio/webpack-isomorphic-compiler
[codecov-image]:https://img.shields.io/codecov/c/github/moxystudio/webpack-isomorphic-compiler/master.svg
[david-dm-url]:https://david-dm.org/moxystudio/webpack-isomorphic-compiler
[david-dm-image]:https://img.shields.io/david/moxystudio/webpack-isomorphic-compiler.svg
[david-dm-dev-url]:https://david-dm.org/moxystudio/webpack-isomorphic-compiler#info=devDependencies
[david-dm-dev-image]:https://img.shields.io/david/dev/moxystudio/webpack-isomorphic-compiler.svg

A compiler utility that makes your life easier if you are building [webpack](https://webpack.js.org/) powered apps with server-side rendering and hot module replacement/reload in mind.


## Installation

`$ npm install webpack-isomorphic-compiler --save-dev`

The current version only works with webpack v2.x.x.


## Motivation

Building applications powered by webpack with server-side rendering (isomorphic/universal apps) is hard:

- When making a production build, you must run webpack for both the client and server
- When developing, we want to rebuild whenever code changes and offer hot module replacement

This is complex, especially setting up the development server:

- You must wait for both compilers to finish, delaying the server responses until then
- If the client or server compilation fails, an error page should be served
- When the server compilations succeeds, we must re-require our server bundle to get its new exports
- The client and server compilers must be in sync and live in perfect harmony

`webpack-isomorphic-compiler` offers an easy-to-use solution to the challenges described above.


## API

**webpackIsomorphicCompiler(clientConfig, serverConfig)**

Creates an aggregated compiler that wraps both client and server webpack compilers.   
The compiler inherits from [EventEmitter](https://nodejs.org/api/events.html).

```js
const webpackIsomorphicCompiler = require('webpack-isomorphic-compiler');

// Get the client & server configs
const clientConfig = /* your client webpack config */;
const serverConfig = /* your server webpack config */

// Create the compiler
const compiler = webpackIsomorphicCompiler(clientConfig, serverConfig);
```

Note that the first entrypoint from the `serverConfig` will be automatically used as the server bundle.


#### Main methods

| Name   | Description   | Returns |
| ------ | ------------- | ------- |
| compile() | Compiles both the client & server | Promise |
| watch([options]) | Starts watching for changes and compiles on-the-fly | Object(self) |
| stopWatching() | Stops watching for changes | Promise |
| isRunning() | Checks if the compiler is running | boolean
| getError() | Gets the compilation error or null if there's no error | Error
| getResult() | Gets the compilation result or null if not available | Object


#### Additional methods

| Name   | Description   | Returns |
| ------ | ------------- | ------- |
| middleware([options]) | Returns the express middleware for development | function |


#### Events

| Name   | Description   | Argument |
| ------ | ------------- | -------- |
| begin | Emitted when a compilation starts | |
| error | Emitted when the compilation fails | `err` |
| end | Emitted when the compilation completes successfully | `result` |

```js
compiler
.on('begin', () => console.log('Compilation started'))
.on('end', (result) => {
    console.log('Compilation finished successfully');
    console.log('Client result', result.client);
    console.log('Server result', result.server);
})
.on('error', (err) => {
    console.log('Compilation failed')
    console.log(err.message);
    err.client && console.log('Client error', err.client);
    err.server && console.log('Server error', err.server);
})
```


#### Read-only properties

| Name   | Description   | Type |
| ------ | ------------- | -------- |
| client | A facade for the client compiler | Object |
| server | A facade for the client compiler | Object |

Both `client` and `server` facades have the following methods:

| Name   | Description   | Type |
| isRunning() | Checks if the compiler is running | boolean
| getError() | Gets the compilation error or null if there's no error | Error
| getResult() | Gets the compilation result or null if not available | Object
| webpackCompiler | The client's webpack compiler | [Compiler](https://github.com/webpack/webpack/blob/bd753567da1248624beaaea14af31d6dbe303411/lib/Compiler.js#L153) |
| webpackConfig | The client's webpack config |

Calling any of the `client.webpackCompiler` and `server.webpackCompiler` public methods is now allowed.


## Typical usage

### Making a production-ready build

Making a production-ready build is as simple as calling `compile()`.  
This method returns a promise that only fulfills when both the client and server compilation succeeds.

```js
const webpackIsomorphicCompiler = require('webpack-isomorphic-compiler');

// Get the client & server configs
const clientConfig = /* your client webpack config */;
const serverConfig = /* your server webpack config */

// Create the compiler
const compiler = webpackIsomorphicCompiler(clientConfig, serverConfig);

// Compile!
compiler.compile()
.then((result) => {
    // result = {
    //   client: { stats },
    //   server: { stats, exports }
    // }
})
.catch((err) => {
    // err = {
    //   message: 'Compilation failed',
    //   [client]: {
    //      message: 'Client compilation error message'
    //      [stats]: <webpack-stats>,
    //      ...
    //   },
    //   [server]: {
    //      message: 'Client compilation error message'
    //      [stats]: <webpack-stats>
    //      ...
    //   }
    // }
})
```


### Development setup

During development we want to build whenever our code changes, in both the client and the server.   
This usually involves setting up an [express](https://expressjs.com/) server. To ease the setup, the `.middleware()` function will return an express middleware that:

- Automatically calls `.watch()` which looks for code changes and automatically compiles
- Optimizes compilation by using [webpack-dev-middleware](https://github.com/webpack/webpack-dev-middleware)
- Delays responses until the aggregated compiler finishes
- Calls `next(err)` if the aggregated compilation failed
- Adds `isomorphicCompilerResult` to `res` and call `next()` if the aggregated compilation succeeds


```js
const express = require('express');
const webpackIsomorphicCompiler = require('webpack-isomorphic-compiler');
const webpackHotMiddleware = require('webpack-hot-middleware');

// Get the client & server configs and setup the compiler
const clientConfig = /* your client webpack config */;
const serverConfig = /* your server webpack config */
const compiler = webpackIsomorphicCompiler(clientConfig, serverConfig);

// Build our express app
const app = express();

// Static files are served without any cache for development
app.use('/', express.static('public', { maxAge: 0, etag: false }));

// Add the middleware that will wait for both client and server compilations to be ready
app.use(compiler.middleware());
// Additionally you may add webpack-hot-middleware to provide hot module replacement
app.use(webpackHotMiddleware(compiler.client.webpackCompiler, { quiet: true }));

// Catch all route to attempt to render our app
app.get('*', (req, res, next) => {
    const { exports: { render } } } = res.isomorphicCompilerResult.server;

    render({ req, res })
    .catch((err) => setImmediate(() => next(err)));
});
```

Note that adding `webpack-dev-middleware` is unnecessary since it's being used internally. You may tweak its options with `compiler.middleware({ devMiddleware })`.


## Tests

`$ npm test`   
`$ npm test:watch` during development


## License

[MIT License](http://opensource.org/licenses/MIT)
