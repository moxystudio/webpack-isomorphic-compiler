'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const webpack = require('webpack');
const wrap = require('lodash.wrap');

function observeWebpackCompiler(type, webpackCompiler, options) {
    const eventEmitter = new EventEmitter();
    const state = {
        isRunning: false,
        error: null,
        result: null,
        watching: null,  // Webpack's Watching instance
    };

    // We are spying some of webpack's methods and listening to some of plugin events
    // Because of that, we need to make good tests to make sure everything works correctly
    // with future upgrades to webpack's compiler

    // Listen to when a standard run() starts and fails
    webpackCompiler.run = wrap(webpackCompiler.run.bind(webpackCompiler), (run, callback) => {
        // Compilation is starting
        Object.assign(state, { isRunning: true, error: null, result: null });
        eventEmitter.emit('begin');

        run((error, stats) => {
            // Compilation finished, the 'failed' plugin is not emitted in this case
            // See: https://github.com/webpack/docs/wiki/plugins/ad6ef7e44bec0c2f1a545a5d983a0938966ccaee#failederr-error
            if (error) {
                Object.assign(state, { isRunning: false, error, result: null });
                eventEmitter.emit('error', error);
            }

            callback(error, stats);
        });
    });

    // Listen to when the compilation finishes
    // This is called in both .run() and .watch() situations
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

    // Listen to when watch mode triggers a run
    webpackCompiler.plugin('watch-run', (compiler, callback) => {
        Object.assign(state, { isRunning: true, error: null, result: null });
        eventEmitter.emit('begin');
        callback();
    });

    // Listen to when the compilation fails when in watch mode
    webpackCompiler.plugin('failed', (error) => {
        Object.assign(state, { isRunning: false, error, result: null });
        eventEmitter.emit('error', error);
    });

    // Listen to when watch mode starts
    webpackCompiler.watch = wrap(webpackCompiler.watch.bind(webpackCompiler), (watch, options, handler) => {
        state.watching = watch(options, handler);
    });

    // Listen to when watch mode is closed
    webpackCompiler.plugin('watch-close', () => {
        state.watching = null;
    });

    return { eventEmitter, state };
}

// -----------------------------------------------------------

function baseCompiler(type, webpackConfig, options) {
    options = Object.assign({
        preEnd: null,
    }, options);

    const webpackCompiler = webpack(webpackConfig);
    const { eventEmitter, state } = observeWebpackCompiler(type, webpackCompiler, options);

    const compiler = Object.assign(eventEmitter, {
        webpackConfig,
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

        assertIdle() {
            assert(!state.isRunning, 'Compiler is running, you can only call this method when idling');
            assert(!state.watching, 'Compiler is watching, you can only call this method when idling');
        },

        compile() {
            compiler.assertIdle();

            return new Promise((resolve, reject) => {
                webpackCompiler.run((err) => {
                    if (err) {
                        reject(state.error);
                    } else {
                        resolve(state.result);
                    }
                });
            });
        },

        watch(options) {
            compiler.assertIdle();

            webpackCompiler.watch(options, () => {});

            return compiler;
        },

        stopWatching() {
            if (!state.watching) {
                return Promise.resolve();
            }

            return new Promise((resolve) => {
                // As per the documentation, .close() never fails
                // Additionally, we rely on `watch-close` event because only the latest callback
                // gets called if webpackWatching.close(callback) is called multiple times
                webpackCompiler.plugin('watch-close', () => resolve());
                state.watching.close();
            });
        },
    });

    return compiler;
}

module.exports = baseCompiler;
