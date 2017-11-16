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
    compiler.run = wrap(compiler.run, (run, options) => {
        const stopReporting = options && options.report && reporter(compiler, options.report);

        try {
            return pFinally(run(), stopReporting);
        } catch (err) {
            stopReporting && stopReporting();
            throw err;
        }
    });

    {
        let stopReporting = null;

        compiler.watch = wrap(compiler.watch, (watch, options, handler) => {
            stopReporting = options && options.report && reporter(compiler, options.report);

            try {
                return watch(options, handler);
            } catch (err) {
                if (stopReporting) {
                    stopReporting();
                    stopReporting = null;
                }

                throw err;
            }
        });

        compiler.unwatch = wrap(compiler.unwatch, (unwatch) => (
            pFinally(unwatch(), () => {
                if (stopReporting) {
                    stopReporting();
                    stopReporting = null;
                }
            })
        ));
    }
}

// --------------------------------------------

function webpackIsomorphicCompiler(...args) {
    const compiler = createCompiler(...args);

    // Secure webpack access by prevent calling its public methods because of race-conditions
    // Users should always use our compiler methods!
    withSecuredWebpack(compiler);

    // Add reporting functionality
    withReporter(compiler);

    return compiler;
}

module.exports = webpackIsomorphicCompiler;
module.exports.reporter = reporter;
