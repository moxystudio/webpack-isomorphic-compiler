'use strict';

const wrap = require('lodash.wrap');
const pFinally = require('p-finally');
const createCompiler = require('./lib/compiler');
const reporter = require('./lib/reporter');

function withSecuredWebpack(compiler) {
    ['client', 'server'].forEach((type) => {
        const blacklistedProperties = ['run', 'watch'];

        compiler[type].webpackCompiler = new Proxy(compiler[type].webpackCompiler, {
            get(target, property) {
                if (blacklistedProperties.includes(property)) {
                    throw new Error('Direct access to webpack compiler\'s public API is not allowed');
                }

                return target[property];
            },
        });
    });
}

function withReporter(compiler) {
    let stopReporting;

    function disposeReporter() {
        stopReporting && stopReporting();
        stopReporting = null;
    }

    function assignReporter(stop) {
        disposeReporter();
        stopReporting = stop;
    }

    compiler.run = wrap(compiler.run, (run, options) => {
        const stop = options && options.report && reporter(compiler, options.report);

        try {
            const ret = pFinally(run(), disposeReporter);

            assignReporter(stop);

            return ret;
        } catch (err) {
            stop && stop();
            throw err;
        }
    });

    compiler.watch = wrap(compiler.watch, (watch, options, handler) => {
        const stop = options && options.report && reporter(compiler, options.report);

        try {
            const ret = watch(options, handler);

            assignReporter(stop);

            return ret;
        } catch (err) {
            stop && stop();
            throw err;
        }
    });

    compiler.unwatch = wrap(compiler.unwatch, (unwatch) => (
        pFinally(unwatch(), disposeReporter)
    ));
}

// --------------------------------------------

function enhancedCompiler(...args) {
    const compiler = createCompiler(...args);

    // Secure webpack access by prevent calling its public methods because of race-conditions
    // Users should always use our compiler methods!
    withSecuredWebpack(compiler);

    // Add reporting functionality
    withReporter(compiler);

    return compiler;
}

module.exports = enhancedCompiler;
module.exports.reporter = reporter;
