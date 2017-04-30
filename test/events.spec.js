'use strict';

const createCompiler = require('./util/createCompiler');
const configBasicClient = require('./configs/basic-client');
const configBasicServer = require('./configs/basic-server');
const configSyntaxError = require('./configs/syntax-error');

function createCompilerWithEvents(...args) {
    const compiler = createCompiler(...args);
    const events = [];

    compiler.on('begin', () => events.push('begin'));
    compiler.on('error', () => events.push('error'));
    compiler.on('end', () => events.push('end'));

    return { compiler, events };
}

describe('events', () => {
    afterEach(() => createCompiler.teardown());

    it('should emit correct events on a successful .run()', () => {
        const { compiler, events } = createCompilerWithEvents(configBasicClient, configBasicServer);

        return compiler.run()
        .catch(() => {})
        .then(() => {
            expect(events).toEqual([
                'begin',
                'end',
            ]);
        });
    });

    it('should emit correct events on a failed .run()', () => {
        const { compiler, events } = createCompilerWithEvents(configBasicClient, configSyntaxError);

        return compiler.run()
        .catch(() => {})
        .then(() => {
            expect(events).toEqual([
                'begin',
                'error',
            ]);
        });
    });

    it('should emit correct events on a successful .watch() cycle', (done) => {
        const { compiler, events } = createCompilerWithEvents(configBasicClient, configBasicServer);

        function finish() {
            expect(events).toEqual([
                'begin',
                'end',
            ]);
            done();
        }

        compiler
        .on('end', finish)
        .on('error', finish)
        .watch();
    });

    it('should emit correct events on a failed .watch() cycle', (done) => {
        const { compiler, events } = createCompilerWithEvents(configBasicClient, configSyntaxError);

        function finish() {
            expect(events).toEqual([
                'begin',
                'error',
            ]);
            done();
        }

        compiler
        .on('end', finish)
        .on('error', finish)
        .watch();
    });

    it('should emit the correct events if a compilation was canceled via .unwatch()', (done) => {
        const { compiler, events } = createCompilerWithEvents(configBasicClient, configBasicServer);
        let error;

        function finish() {
            expect(events).toEqual([
                'begin',
                'error',
            ]);
            expect(error.message).toMatch(/\bcanceled\b/);
            done();
        }

        compiler
        .on('end', finish)
        .on('error', (err) => {
            error = err;
            finish();
        })
        .watch()
        .unwatch();
    });
});
