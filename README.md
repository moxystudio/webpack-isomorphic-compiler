# webpack-isomorphic-compiler

A compiler utility that makes your life easier if you building [webpack](https://webpack.js.org/) powered apps with server-side rendering and hot module replacement/reload in mind.


## Installation

`$ npm install webpack-isomorphic-compiler --save-dev`


## Motivation

Building isomorphic applications with webpack and integrate them into your development and production workflow is hard:

- When producing a production build, you must run webpack for both the client and server
- When developing, we want to rebuild whenever code changes and offer hot module replacement

This is difficult, especially setting up the development server:

- You must wait for both compilers to finish, delaying responses until then
- If the client or server compilation fails, an error page should be served
- When both compilations succeed, we must re-require our server bundle to get its new exports
- The client and server compilers must be in sync and live in perfect harmony


`webpack-isomorphic-compiler` offers an easy-to-use solution to the challenges described above.


## Usage

```js
const webpackIsomorphicCompiler = require('webpack-isomorphic-compiler');

const clientConfig = /* your client webpack config */;
const serverConfig = /* your server webpack config */

webpackIsomorphicCompiler(clientConfig, serverConfig)
// The promise only resolves when client and server compilers both resolve
// The promise is rejected if one of them failed
.then((result) => {
    // result = {
    //   client: { stats },
    //   server: { stats, exports }
    // }
});
```


### Watching

```js
const webpackIsomorphicCompiler = require('webpack-isomorphic-compiler');

const clientConfig = /* your client webpack config */;
const serverConfig = /* your server webpack config */
const watchCompiler = webpackIsomorphicCompiler.watch(clientConfig, serverConfig);

watchCompiler
.on('begin', () => console.log('Compilation started'))
.on('error', (err) => console.log('Compilation failed', err))
.on('end', (result) => console.log('Compilation ended successfully', result));
```

The object returned by `watch()` is a `Compiler` instance. You may listen to compilation events since it is an `EventEmitter`. Note that these events are aggregated, for instance, the `end` event is only emitted when both the compilers emit `end`.

You may stop watching by calling `watchCompiler.stop()`.


### webpackIsomorphicCompiler.watchWithMiddleware()

```js
const express = require('express');
const webpackIsomorphicCompilation = require('webpack-isomorphic-compilation');

// Create our watch compiler with middleware support
const clientConfig = /* your client webpack config */;
const serverConfig = /* your server webpack config */;
const watchCompiler = webpackIsomorphicCompiler.watchWithMiddleware(clientConfig, serverConfig);

const app = express();

// Static files are served without any cache during dev
app.use('/', express.static('public'), {
    maxAge: 0,
    etag: false,
}));

// Install the dev compiler middleware
app.use(watchCompiler.middleware());

// Catch all route to attempt to render our app
app.get('*', (req, res, next) => {
    const { exports: { render } } } = devCompiler.result.server;

    render({ req, res })
    .catch((err) => setImmediate(() => next(err)));
};
```

The object returned by `watchWithMiddleware()` is the same as `watch()`.


### Compiler

All functions available return a Compiler instance which allows you to listen to compilation events and provides some useful functions:

Events:

| Name   | Description   | Argument |
| ------ | ------------- | -------- |
| start | Emitted when a compilation starts | |
| error | Emitted when a compilation fails | `err` |
| end | Emitted when a compilation starts and provides the result | `result` |

Methods:

| Name   | Description   | Returns |
| ------ | ------------- | ------- |
| isRunning() | Checks if the compiler running | boolean
| getResult() | Gets the compilation result or null if not available | Error
| getError() | Gets the compilation error or null if there's no error | Object
```


## Tests

`$ npm test`   
`$ npm test:watch` during development


## License

[MIT License](http://opensource.org/licenses/MIT)
