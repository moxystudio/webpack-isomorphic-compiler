'use strict';

const EventEmitter = require('events');
const pProps = require('p-props');
const createClientCompiler = require('./low-level-compilers/clientCompiler');
const createServerCompiler = require('./low-level-compilers/serverCompiler');

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
        // Skip if already failed or if one of the compilers is still running
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

            Object.assign(state, { running: false, error, result: null });
            eventEmitter.emit('error', error);
        } else {
            const result = {
                client: clientCompiler.getResult(),
                server: serverCompiler.getResult(),
            };

            Object.assign(state, { running: false, error: null, result });
            eventEmitter.emit('end', result);
        }
    }

    return { eventEmitter, state };
}

// -----------------------------------------------------------

function compiler(clientConfig, serverConfig) {
    const clientCompiler = createClientCompiler(clientConfig);
    const serverCompiler = createServerCompiler(serverConfig);
    const { eventEmitter, state } = observeCompilers(clientCompiler, serverCompiler);
    let watching;

    const compiler = Object.assign(eventEmitter, {
        client: clientCompiler,
        server: serverCompiler,

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
            return pProps({
                client: clientCompiler.compile(),
                server: serverCompiler.compile(),
            });
        },

        middleware() {

        },

        watch(options) {
            watching = {
                client: clientCompiler.watch(options),
                server: serverCompiler.watch(options),
            };

            return watching;
        },

        stopWatching() {
            if (!watching) {
                return Promise.resolve();
            }

            return Promise.all([watching.client, watching.server])
            .then(() => {});
        },
    });

    return compiler;
}

module.exports = compiler;
