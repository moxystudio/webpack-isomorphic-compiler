'use strict';

const EventEmitter = require('events');
const webpack = require('webpack');
const pDefer = require('p-defer');

function observeWebpackCompiler(type, webpackCompiler, options) {
    const eventEmitter = new EventEmitter();
    const state = {
        isRunning: false,
        error: null,
        result: null,
    };

    // Listen to when watch mode triggers a run
    webpackCompiler.plugin('watch-run', (compiler, callback) => {
        Object.assign(state, { isRunning: true, error: null, result: null });
        eventEmitter.emit('begin');
        callback();
    });

    // Listen to when the compilation fails (fatal)
    webpackCompiler.plugin('fail', (error) => {
        Object.assign(state, { isRunning: false, error, result: null });
        eventEmitter.emit('error', error);
    });

    // Listen to when the compilation finishes
    webpackCompiler.plugin('done', (stats) => {
        const statsJson = stats.toJson();

        // Does it have compilation errors?
        if (statsJson.errors.length) {
            const error = Object.assign(new Error(`Webpack ${type}-side build failed`), { stats });

            Object.assign(state, { isRunning: false, error, result: null });
        // Otherwise the build finished successfully
        } else {
            Object.assign(state, { isRunning: false, error: null, result: { stats } });

            // Call `preEnd` to give a chance to others to further analyze the build
            try {
                options.preEnd && options.preEnd(state.result);
            } catch (error) {
                Object.assign(state, { error, result: null });
            }
        }

        if (state.error) {
            eventEmitter.emit('error', state.error);
        } else {
            eventEmitter.emit('end', state.result);
        }
    });

    return { eventEmitter, state };
}

// -----------------------------------------------------------

function baseCompiler(type, config, options) {
    options = Object.assign({
        preEnd: null,
    }, options);

    const webpackCompiler = webpack(config);
    const { eventEmitter, state } = observeWebpackCompiler(type, webpackCompiler, options);
    let watching;

    const compiler = Object.assign(eventEmitter, {
        config,
        webpackCompiler,

        isRunning() {
            return state.isRunning;
        },

        getResult() {
            return state.result;
        },

        getError() {
            return state.error;
        },

        compile() {
            const deferred = pDefer();

            function cleanup() {
                compiler.removeListener('error', onError);
                compiler.removeListener('end', onEnd);
            }

            function onError(err) {
                cleanup();
                deferred.reject(err);
            }

            function onEnd(result) {
                cleanup();
                deferred.resolve(result);
            }

            compiler
            .on('error', onError)
            .on('end', onEnd)
            .compile();

            return deferred.promise;
        },

        watch(options) {
            watching = webpackCompiler.watch(options, () => {});

            return watching;
        },

        stopWatching() {
            if (!watching) {
                return Promise.resolve();
            }

            // As per the documentation, .close() never fails
            return new Promise((resolve) => {
                watching = null;
                resolve();
            });
        },
    });

    return compiler;
}

module.exports = baseCompiler;
