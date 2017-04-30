'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const webpack = require('webpack');
const wrap = require('lodash.wrap');

function observeWebpackCompiler(type, webpackCompiler) {
    const eventEmitter = new EventEmitter();
    const state = {
        isCompiling: false,
        error: null,
        stats: null,
        watching: null,  // Webpack's Watching instance
    };

    // Avoid NodeJS global throw if there's no error listeners
    eventEmitter.on('error', () => {});

    // We are spying some of webpack's methods and listening to some of plugin events
    // Because of that, we need to make good tests to be sure everything works correctly
    // with future webpack versions

    // Listen to when a standard run() starts and fails
    webpackCompiler.run = wrap(webpackCompiler.run, (run, callback) => {
        // Compilation is starting
        Object.assign(state, { isCompiling: true, error: null, stats: null });
        eventEmitter.emit('begin');

        run.call(webpackCompiler, (error, stats) => {
            // Compilation finished, the 'failed' plugin is not emitted in this case
            // See: https://github.com/webpack/docs/wiki/plugins/ad6ef7e44bec0c2f1a545a5d983a0938966ccaee#failederr-error
            if (error) {
                Object.assign(state, { isCompiling: false, error, stats: null });
                eventEmitter.emit('error', error);
            }

            callback(error, stats);
        });
    });

    // Listen to when the compilation finishes
    // This is called in both .run() and .watch() situations
    webpackCompiler.plugin('done', (stats) => {
        // Does it have compilation errors?
        if (stats.hasErrors()) {
            const error = Object.assign(new Error(`Webpack ${type}-side build failed`), { stats });

            Object.assign(state, { isCompiling: false, error, stats: null });
            eventEmitter.emit('error', error);
        // Otherwise the build finished successfully
        } else {
            Object.assign(state, { isCompiling: false, error: null, stats });
            eventEmitter.emit('end', stats);
        }
    });

    // Listen to when watch mode triggers a run
    webpackCompiler.plugin('watch-run', (compiler, callback) => {
        Object.assign(state, { isCompiling: true, error: null, stats: null });
        eventEmitter.emit('begin');
        callback();
    });

    // Listen to when the compilation fails when in watch mode
    webpackCompiler.plugin('failed', (error) => {
        Object.assign(state, { isCompiling: false, error, stats: null });
        eventEmitter.emit('error', error);
    });

    // Listen to when watch mode starts
    webpackCompiler.watch = wrap(webpackCompiler.watch, (watch, options, handler) => {
        state.watching = watch.call(webpackCompiler, options, handler);
    });

    // Listen to when watch mode is closed
    webpackCompiler.plugin('watch-close', () => {
        state.watching = null;

        if (state.isCompiling) {
            const error = Object.assign(new Error(`Webpack ${type}-side build canceled`), { hideStack: true });

            Object.assign(state, { isCompiling: false, error, stats: null });
            eventEmitter.emit('error', error);
        }
    });

    return { eventEmitter, state };
}

// -----------------------------------------------------------

function baseCompiler(type, webpackConfig) {
    const webpackCompiler = webpack(webpackConfig);
    const { eventEmitter, state } = observeWebpackCompiler(type, webpackCompiler);

    const compiler = Object.assign(eventEmitter, {
        webpackConfig,
        webpackCompiler,

        isCompiling() {
            return state.isCompiling;
        },

        getStats() {
            return state.stats;
        },

        getError() {
            return state.error;
        },

        assertIdle() {
            assert(!state.isCompiling, 'Compiler is compiling, you can only call this method when idling');
            assert(!state.watching, 'Compiler is watching, you can only call this method when idling');
        },

        run() {
            compiler.assertIdle();

            return new Promise((resolve, reject) => {
                webpackCompiler.run((err, stats) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(stats);
                    }
                });
            });
        },

        watch(options, handler) {
            compiler.assertIdle();

            /* istanbul ignore if */
            if (typeof options === 'function') {
                handler = options;
                options = null;
            }

            webpackCompiler.watch(options, handler || (() => {}));

            return compiler;
        },

        unwatch() {
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
