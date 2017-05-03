'use strict';

const EventEmitter = require('events');
const pSettle = require('p-settle');
const pDefer = require('p-defer');
const subCompiler = require('./subCompiler');

function observeCompilers(clientCompiler, serverCompiler) {
    const eventEmitter = new EventEmitter();
    const state = {
        isCompiling: false,
        error: null,
        stats: null,
    };

    // Avoid NodeJS global throw if there's no error listeners
    eventEmitter.on('error', () => {});

    // Listen to compilers lifecycle events
    serverCompiler.on('begin', onBegin);
    serverCompiler.on('error', onErrorOrEnd);
    serverCompiler.on('end', onErrorOrEnd);
    clientCompiler.on('begin', onBegin);
    clientCompiler.on('error', onErrorOrEnd);
    clientCompiler.on('end', onErrorOrEnd);

    function onBegin() {
        if (state.isCompiling) {
            return;
        }

        Object.assign(state, { isCompiling: true, error: null, stats: null });
        eventEmitter.emit('begin');
    }

    function onErrorOrEnd() {
        // Wait for all compilers to be done
        if (clientCompiler.isCompiling() || serverCompiler.isCompiling()) {
            return;
        }

        const error = clientCompiler.getError() || serverCompiler.getError();

        if (error) {
            Object.assign(state, { isCompiling: false, error, stats: null });
            eventEmitter.emit('error', error);
        } else {
            const stats = {
                client: clientCompiler.getStats(),
                server: serverCompiler.getStats(),
            };

            Object.assign(state, { isCompiling: false, error: null, stats });
            eventEmitter.emit('end', stats);
        }
    }

    return { eventEmitter, state };
}

function createSubFacade(subCompiler) {
    return {
        webpackConfig: subCompiler.webpackConfig,
        webpackCompiler: subCompiler.webpackCompiler,
    };
}

// -----------------------------------------------------------

function compiler(clientConfig, serverConfig) {
    const clientCompiler = subCompiler('client', clientConfig);
    const serverCompiler = subCompiler('server', serverConfig);
    const { eventEmitter, state } = observeCompilers(clientCompiler, serverCompiler);

    const compiler = Object.assign(eventEmitter, {
        client: createSubFacade(clientCompiler),
        server: createSubFacade(serverCompiler),

        isCompiling() {
            return state.isCompiling;
        },

        getStats() {
            return state.stats;
        },

        getError() {
            return state.error;
        },

        run() {
            clientCompiler.assertIdle();
            serverCompiler.assertIdle();

            return pSettle([
                clientCompiler.run(),
                serverCompiler.run(),
            ])
            .then(() => {
                if (state.error) {
                    throw state.error;
                }

                return state.stats;
            });
        },

        watch(options, handler) {
            clientCompiler.assertIdle();
            serverCompiler.assertIdle();

            if (typeof options === 'function') {
                handler = options;
                options = null;
            }

            function baseHandler() {
                !state.isCompiling && handler(state.error, state.stats);
            }

            clientCompiler.watch(options, handler && baseHandler);
            serverCompiler.watch(options, handler && baseHandler);

            return compiler;
        },

        unwatch() {
            return Promise.all([
                clientCompiler.unwatch(),
                serverCompiler.unwatch(),
            ])
            .then(() => {});
        },

        resolve() {
            const { error, stats } = state;

            // Already resolved?
            if (error) {
                return Promise.reject(error);
            }

            if (stats) {
                return Promise.resolve(stats);
            }

            // Wait for it to be resolved
            const deferred = pDefer();

            function cleanup() {
                eventEmitter.removeListener('error', onError);
                eventEmitter.removeListener('end', onEnd);
            }

            function onError(err) {
                cleanup();
                deferred.reject(err);
            }

            function onEnd(stats) {
                cleanup();
                deferred.resolve(stats);
            }

            compiler
            .on('error', onError)
            .on('end', onEnd);

            return deferred.promise;
        },
    });

    return compiler;
}

module.exports = compiler;
