'use strict';

const pSettle = require('p-settle');
const pDefer = require('p-defer');
const wrap = require('lodash.wrap');
const webpackSaneCompiler = require('webpack-sane-compiler');
const observeCompilers = require('./lib/observeCompilers');

function createSubFacade(saneCompiler) {
    return {
        webpackConfig: saneCompiler.webpackConfig,
        webpackCompiler: saneCompiler.webpackCompiler,
    };
}

function compiler(client, server) {
    const clientCompiler = webpackSaneCompiler(client);
    const serverCompiler = webpackSaneCompiler(server);
    const { eventEmitter, state } = observeCompilers(clientCompiler, serverCompiler);

    const compiler = Object.assign(eventEmitter, {
        client: createSubFacade(clientCompiler),
        server: createSubFacade(serverCompiler),

        isCompiling() {
            return state.isCompiling;
        },

        getCompilation() {
            return state.compilation;
        },

        getError() {
            return state.error;
        },

        run() {
            clientCompiler.assertIdle('run');
            serverCompiler.assertIdle('run');

            return pSettle([
                clientCompiler.run(),
                serverCompiler.run(),
            ])
            .then(() => {
                if (state.error) {
                    throw state.error;
                }

                return state.compilation;
            });
        },

        watch(options, handler) {
            clientCompiler.assertIdle('watch');
            serverCompiler.assertIdle('watch');

            if (typeof options === 'function') {
                handler = options;
                options = null;
            }

            handler = handler && wrap(handler, (handler) => {
                !state.isCompiling && handler(state.error, state.compilation);
            });

            const clientInvalidate = clientCompiler.watch(options, handler);
            const serverInvalidate = serverCompiler.watch(options, handler);

            return () => {
                eventEmitter.emit('invalidate');
                observeCompilers.resetState(state);

                clientInvalidate();
                serverInvalidate();
            };
        },

        unwatch() {
            return Promise.all([
                clientCompiler.unwatch(),
                serverCompiler.unwatch(),
            ])
            .then(() => {});
        },

        resolve() {
            const { error, compilation } = state;

            // Already resolved?
            if (error) {
                return Promise.reject(error);
            }

            if (compilation) {
                return Promise.resolve(compilation);
            }

            // Wait for it to be resolved
            const deferred = pDefer();

            const cleanup = () => {
                eventEmitter.removeListener('error', onError);
                eventEmitter.removeListener('end', onEnd);
            };

            const onError = (err) => {
                cleanup();
                deferred.reject(err);
            };

            const onEnd = (compilation) => {
                cleanup();
                deferred.resolve(compilation);
            };

            compiler
            .on('error', onError)
            .on('end', onEnd);

            return deferred.promise;
        },
    });

    return compiler;
}

module.exports = compiler;
