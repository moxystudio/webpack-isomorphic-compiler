'use strict';

const compose = require('compose-middleware').compose;
const webpackMiddleware = require('webpack-dev-middleware');
const resolveCompilation = require('./util/resolveCompilation');

function resolveCompilationMiddleware(compiler) {
    return (req, res, next) => {
        resolveCompilation(compiler)
        .then((result) => {
            res.isomorphicCompilerResult = result;
        })
        .then(
            () => setImmediate(() => next()),
            (err) => setImmediate(() => next(err))
        );
    };
}

function devMiddleware(compiler, options) {
    const { webpackCompiler, webpackConfig } = compiler.client;

    // We are going to instantiate `webpack-dev-middleware` with lazy option enabled and
    // stub `run()` to do nothing.. We do this because we are actually watching but at an higher-level
    const stubbedWebpackCompiler = new Proxy(webpackCompiler, {
        get(target, property) {
            if (property === 'run') {
                return () => {};
            }

            return target[property];
        },
    });

    // Ensure good options
    const middlewareOptions = {
        lazy: true,  // See comment above
        // quiet: true,  // We have our own reporter
        watchOptions: options.watchOptions || undefined,  // Middleware doesn't like it being null so we cast it to undefined
        publicPath: webpackConfig.output.publicPath,  // Why doesn't webpack do this under the hood?!
        index: 'some-file-that-will-never-exist',
        headers: options.headers,
    };

    return webpackMiddleware(stubbedWebpackCompiler, middlewareOptions);
}

// -----------------------------------------------------------

function middleware(compiler) {
    return (options) => {
        options = Object.assign({
            watchOptions: null,  // .watch() options
            headers: null,  // See webpack-dev-middleware `headers` option
        }, options);

        // Create the middleware first because the FS will be replaced with an in-memory one
        const middleware = compose([
            resolveCompilationMiddleware(compiler),
            devMiddleware(compiler, options),
        ]);

        // Finally start watching!
        compiler.watch(options.watchOptions);

        return middleware;
    };
}

module.exports = middleware;
