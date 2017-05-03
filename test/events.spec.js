'use strict';

const createCompiler = require('./util/createCompiler');
const configClientBasic = require('./configs/client-basic');
const configServerBasic = require('./configs/server-basic');
const configServerSyntaxError = require('./configs/server-syntax-error');

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
        const { compiler, events } = createCompilerWithEvents(configClientBasic, configServerBasic);

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
        const { compiler, events } = createCompilerWithEvents(configClientBasic, configServerSyntaxError);

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
        const { compiler, events } = createCompilerWithEvents(configClientBasic, configServerBasic);

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
        const { compiler, events } = createCompilerWithEvents(configClientBasic, configServerSyntaxError);

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
        const { compiler, events } = createCompilerWithEvents(configClientBasic, configServerBasic);
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
