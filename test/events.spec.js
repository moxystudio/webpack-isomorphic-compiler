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
    compiler.on('invalidate', () => events.push('invalidate'));

    return { compiler, events };
}

afterEach(() => createCompiler.teardown());

it('should emit correct events on a successful .run()', async () => {
    const { compiler, events } = createCompilerWithEvents(configClientBasic, configServerBasic);

    await compiler.run();

    expect(events).toEqual(['begin', 'end']);
});

it('should emit correct events on a failed .run()', async () => {
    const { compiler, events } = createCompilerWithEvents(configClientBasic, configServerSyntaxError);

    try {
        await compiler.run();
    } catch (err) { /* Do nothing */ }

    expect(events).toEqual(['begin', 'error']);
});

it('should emit correct events on a successful .watch() cycle', (done) => {
    const { compiler, events } = createCompilerWithEvents(configClientBasic, configServerBasic);

    const finish = () => {
        expect(events).toEqual(['begin', 'end']);

        done();
    };

    compiler
    .on('end', finish)
    .on('error', finish)
    .watch();
});

it('should emit correct events on a failed .watch() cycle', (done) => {
    const { compiler, events } = createCompilerWithEvents(configClientBasic, configServerSyntaxError);

    const finish = () => {
        expect(events).toEqual(['begin', 'error']);

        done();
    };

    compiler
    .on('end', finish)
    .on('error', finish)
    .watch();
});

it('should emit the correct events if a compilation was canceled via .unwatch()', (done) => {
    const { compiler, events } = createCompilerWithEvents(configClientBasic, configServerBasic);
    let error;

    const finish = () => {
        expect(events).toEqual(['begin', 'error']);
        expect(error.message).toMatch(/\bcanceled\b/);

        done();
    };

    compiler
    .on('end', finish)
    .on('error', (err) => {
        error = err;
        finish();
    })
    .watch();

    compiler.unwatch();
});

it('should emit the correct events if a compilation was invalidated', (done) => {
    const { compiler, events } = createCompilerWithEvents(configClientBasic, configServerBasic);

    const finish = () => {
        expect(events).toEqual(['begin', 'end', 'invalidate', 'begin', 'end']);

        done();
    };

    const invalidate = compiler
    .on('error', finish)
    .once('end', () => invalidate())
    .on('invalidate', () => compiler.on('end', finish))
    .watch();
});
