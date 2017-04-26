'use strict';

const EventEmitter = require('events');
const pProps = require('p-props');
const pick = require('lodash.pick');
const createClientCompiler = require('./sub-compilers/clientCompiler');
const createServerCompiler = require('./sub-compilers/serverCompiler');

function observeCompilers(clientCompiler, serverCompiler) {
    const eventEmitter = new EventEmitter();
    const state = {
        isRunning: false,
        error: null,
        result: null,
    };

    serverCompiler.on('begin', onBegin);
    serverCompiler.on('error', onErrorOrEnd);
    serverCompiler.on('end', onErrorOrEnd);
    clientCompiler.on('begin', onBegin);
    clientCompiler.on('error', onErrorOrEnd);
    clientCompiler.on('end', onErrorOrEnd);

    function onBegin() {
        if (state.isRunning) {
            return;
        }

        Object.assign(state, { isRunning: true, error: null, result: null });
        eventEmitter.emit('begin');
    }

    function onErrorOrEnd() {
        // Wait for all compilers to be done
        if (clientCompiler.isRunning() || serverCompiler.isRunning()) {
            return;
        }

        const clientError = clientCompiler.getError();
        const serverError = serverCompiler.getError();

        if (clientError || serverError) {
            const error = Object.assign(new Error('Compilation failed'), {
                client: clientError,
                server: serverError,
            });

            Object.assign(state, { isRunning: false, error, result: null });
            eventEmitter.emit('error', error);
        } else {
            const result = {
                client: clientCompiler.getResult(),
                server: serverCompiler.getResult(),
            };

            Object.assign(state, { isRunning: false, error: null, result });
            eventEmitter.emit('end', result);
        }
    }

    return { eventEmitter, state };
}

function createSubCompilerFacade(subCompiler) {
    return pick(subCompiler, [
        'webpackConfig', 'webpackCompiler',
        'isRunning', 'getError', 'getResult',
    ]);
}

// -----------------------------------------------------------

function compiler(clientConfig, serverConfig) {
    const clientCompiler = createClientCompiler(clientConfig);
    const serverCompiler = createServerCompiler(serverConfig);
    const { eventEmitter, state } = observeCompilers(clientCompiler, serverCompiler);

    const compiler = Object.assign(eventEmitter, {
        client: createSubCompilerFacade(clientCompiler),
        server: createSubCompilerFacade(serverCompiler),

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
            clientCompiler.assertIdle();
            serverCompiler.assertIdle();

            return pProps({
                client: clientCompiler.compile(),
                server: serverCompiler.compile(),
            });
        },

        watch(options) {
            clientCompiler.assertIdle();
            serverCompiler.assertIdle();

            clientCompiler.watch(options);
            serverCompiler.watch(options);

            return compiler;
        },

        stopWatching() {
            return Promise.all([
                clientCompiler.stopWatching(),
                serverCompiler.stopWatching(),
            ])
            .then(() => {});
        },
    });

    return compiler;
}

module.exports = compiler;
