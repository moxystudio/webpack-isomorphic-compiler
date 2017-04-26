'use strict';

const createCompiler = require('./lib/compiler');
const middleware = require('./lib/middleware');

function secureWebpackCompiler(webpackCompiler) {
    const blacklistedProperties = ['run', 'watch'];

    return new Proxy(webpackCompiler, {
        get(target, property) {
            if (blacklistedProperties.includes(property)) {
                throw new Error('Direct access to webpack compiler\'s public API is not allowed');
            }

            return target[property];
        },
    });
}

// --------------------------------------------

function compiler(...args) {
    const compiler = createCompiler(...args);

    // Enchance compiler with the middleware method
    compiler.middleware = middleware(compiler);

    // Secure webpack access by prevent calling its public methods because of race-conditions
    // Users should always use our compiler methods!
    compiler.client.webpackCompiler = secureWebpackCompiler(compiler.client.webpackCompiler);
    compiler.server.webpackCompiler = secureWebpackCompiler(compiler.server.webpackCompiler);

    return compiler;
}

module.exports = compiler;
