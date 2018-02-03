'use strict';

const EventEmitter = require('events');

function observeCompilers(clientCompiler, serverCompiler) {
    const eventEmitter = new EventEmitter();
    const state = resetState({});

    const onBegin = () => {
        if (state.isCompiling) {
            return;
        }

        Object.assign(state, { isCompiling: true, beginAt: Date.now(), error: null, compilation: null });
        eventEmitter.emit('begin');
    };

    const onError = (type, err) => {
        err.message += ` (${type})`;
        onEnd();
    };

    const onEnd = () => {
        // Wait for all compilers to be done
        if (clientCompiler.isCompiling() || serverCompiler.isCompiling()) {
            return;
        }

        const error = clientCompiler.getError() || serverCompiler.getError();

        if (error) {
            Object.assign(state, { isCompiling: false, error, compilation: null });
            eventEmitter.emit('error', error);
        } else {
            const compilation = {
                duration: Date.now() - state.beginAt,
                clientStats: clientCompiler.getCompilation().stats,
                serverStats: serverCompiler.getCompilation().stats,
            };

            // Set the `stats` for compatibility with webpack-sane-compiler but keep
            // it hidden if someone is debugging it with console.log's or similar
            Object.defineProperty(compilation, 'stats', {
                value: compilation.clientStats,
                enumerable: false,
                configurable: true,
            });

            Object.assign(state, { isCompiling: false, error: null, compilation });
            eventEmitter.emit('end', compilation);
        }
    };

    // Avoid NodeJS global throw if there's no error listeners
    eventEmitter.on('error', () => {});

    // Listen to compilers lifecycle events
    clientCompiler
    .on('begin', onBegin)
    .on('end', onEnd)
    .on('error', (err) => onError('client', err));

    serverCompiler
    .on('begin', onBegin)
    .on('end', onEnd)
    .on('error', (err) => onError('server', err));

    return { eventEmitter, state };
}

function resetState(state) {
    return Object.assign(state, { isCompiling: false, beginAt: null, error: null, compilation: null });
}

module.exports = observeCompilers;
module.exports.resetState = resetState;
