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

A compiler that makes your life easier if you are building isomorphic [webpack](https://webpack.js.org/) powered apps, that is, single page applications with server-side rendering.


## Installation

`$ npm install webpack-isomorphic-compiler --save-dev`

The current version only works with webpack v2.x.x.


## Motivation

Building applications powered by webpack with server-side rendering (isomorphic/universal apps) is hard:

- When making a production build, you must compile both the client and server
- When developing, we want to rebuild the client & server whenever code changes and offer hot module replacement

This is complex, especially setting up the development server:

- You must wait for both compilers to finish, delaying the server responses until then
- If the client or server compilation fails, an error page should be served
- When the server compilations succeeds, we must re-require our server bundle to get its new exports
- The client and server compilers must be in sync and live in perfect harmony

To solve the compilation part, `webpack-isomorphic-compiler` offers an aggregated compiler that syncs up the client and server compilation.
To solve the development part, [webpack-isomorphic-dev-middleware](https://github.com/moxystudio/webpack-isomorphic-dev-middleware) offers an express middleware that integrates seamlessly with `webpack-isomorphic-compiler`.

But why not use the multi-compiler mode from webpack? Glad you ask.
Webpack's MultiCompiler doesn't offer all the plugin handlers that a single Compiler does, which makes it difficult to know what's happening under the hood. For instance, it's hard to known when a compilation starts when using `.watch()`.
Additionally, it has some issues when used with `webpack-dev-middleware`.

`webpack-isomorphic-compiler` solves the isomorphic compilation in a clear way and with a saner API.


## API

**webpackIsomorphicCompiler(clientConfig, serverConfig)**

Creates an aggregated compiler that wraps both client and server webpack compilers.   

```js
const webpackIsomorphicCompiler = require('webpack-isomorphic-compiler');

const clientConfig = /* ... */;
const serverConfig = /* ... */;
const compiler = webpackIsomorphicCompiler(clientConfig, serverConfig);
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
| report | Enable reporting | boolean/[object](#reporter) | false


### .watch([options], [handler])

Starts watching for changes and compiles on-the-fly.   
Returns itself to allow chaining.

Calls `handler` everytime the compilation fails or succeeds.
This is similar to webpack's watch() method, except that `handler` gets called with an error if stats contains errors.

Available options:

| Name   | Description   | Type     | Default |
| ------ | ------------- | -------- | ------- |
| poll | Use polling instead of native watchers | boolean | false
| aggregateTimeout | Wait so long for more changes (ms) | err | 200
| report | Enable reporting | boolean/[object](#reporter) | false

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

Calling webpack compiler public methods is now allowed.


### Reporter

Both `run()` and `watch()` accepts a `report` option that, when enabled, prints information related to the compilation process.

The option can be a boolean or an object that maps to the following options:

| Name   | Description   | Type     | Default |
| ------ | ------------- | -------- | ------- |
| stats | Display webpack stats after each successful compilation | boolean|string | false
| statsOptions | Which stats to display, see [stats.toString()](https://webpack.js.org/api/node/#stats-object) | [sane default](https://github.com/moxystudio/webpack-isomorphic-compiler/blob/3f572a471fcd6632964471ccf201bb3da348ed40/lib/reporter.js#L83)


## Tests

`$ npm test`   
`$ npm test:watch` during development


## License

[MIT License](http://opensource.org/licenses/MIT)
