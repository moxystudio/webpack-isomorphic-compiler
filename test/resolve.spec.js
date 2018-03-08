'use strict';

const pSettle = require('p-settle');
const createCompiler = require('./util/createCompiler');
const configClientBasic = require('./configs/client-basic');
const configServerBasic = require('./configs/server-basic');
const configClientSyntaxError = require('./configs/client-syntax-error');

afterEach(() => createCompiler.teardown());

it('should fulfill immediately if the compiler has a compilation result', async () => {
    const compiler = createCompiler(configClientBasic, configServerBasic);

    const compilation = await compiler.run();

    await expect(compiler.resolve()).resolves.toBe(compilation);
});

it('should reject immediately if the compiler has an error', async () => {
    const compiler = createCompiler(configClientSyntaxError, configServerBasic);

    expect.assertions(1);

    try {
        await compiler.run();
    } catch (err) {
        try {
            await compiler.resolve();
        } catch (resolvedErr) {
            expect(resolvedErr).toBe(err);
        }
    }
});

it('should wait and fulfill after a successful compilation', async () => {
    const compiler = createCompiler(configClientBasic, configServerBasic);

    const [compilation, resolvedCompilation] = await Promise.all([
        compiler.run(),
        compiler.resolve(),
    ]);

    expect(compilation).toBe(resolvedCompilation);
});

it('should wait and reject after a failed compilation', async () => {
    const compiler = createCompiler(configClientSyntaxError, configServerBasic);

    const [compilation, resolvedCompilation] = await pSettle([
        compiler.run(),
        compiler.resolve(),
    ]);

    expect(compilation.isRejected).toBe(true);
    expect(resolvedCompilation.isRejected).toBe(true);
    expect(compilation.reason).toBe(resolvedCompilation.reason);
});
