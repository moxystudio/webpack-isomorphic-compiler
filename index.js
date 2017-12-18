'use strict';

const pSettle = require('p-settle');
const pDefer = require('p-defer');
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

                return state.compilation;
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
                !state.isCompiling && handler(state.error, state.compilation);
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

            function cleanup() {
                eventEmitter.removeListener('error', onError);
                eventEmitter.removeListener('end', onEnd);
            }

            function onError(err) {
                cleanup();
                deferred.reject(err);
            }

            function onEnd(compilation) {
                cleanup();
                deferred.resolve(compilation);
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
