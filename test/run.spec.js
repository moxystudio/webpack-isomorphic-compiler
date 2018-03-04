'use strict';

const fs = require('fs');
const createCompiler = require('./util/createCompiler');
const configClientBasic = require('./configs/client-basic');
const configServerBasic = require('./configs/server-basic');
const configClientSyntaxError = require('./configs/client-syntax-error');
const configServerSyntaxError = require('./configs/server-syntax-error');

jest.setTimeout(20000);

afterEach(() => createCompiler.teardown());

it('should fulfill with the compilation result', async () => {
    const compiler = createCompiler(configClientBasic, configServerBasic);

    const { clientStats, serverStats, duration, stats } = await compiler.run();

    expect(clientStats.toJson().assetsByChunkName).toEqual({ main: 'client.js' });
    expect(serverStats.toJson().assetsByChunkName).toEqual({ main: 'server.js' });
    expect(typeof duration).toBe('number');
    expect(stats).toBe(clientStats);
});

it('should fail if one of the compilations fails', async () => {
    expect.assertions(4);

    let compiler = createCompiler(configClientBasic, configServerSyntaxError);

    try {
        await compiler.run();
    } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect(err.message).toBe('Webpack compilation failed (server)');
    }

    compiler = createCompiler(configClientSyntaxError, configServerBasic);

    try {
        await compiler.run();
    } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect(err.message).toBe('Webpack compilation failed (client)');
    }
});

it('should fail if there\'s a fatal error', async () => {
    const compiler = createCompiler(configClientBasic, configServerBasic);
    const contrivedError = new Error('foo');

    compiler.addClientHook('beforeRun', 'tapAsync', (compiler, callback) => {
        setImmediate(() => callback(contrivedError));
    });

    try {
        await compiler.run();
    } catch (err) {
        expect(err).toBe(contrivedError);
    }
});

it('should output assets', async () => {
    const compiler = createCompiler(configClientBasic, configServerBasic);

    await compiler.run();

    expect(fs.existsSync(`${compiler.client.webpackConfig.output.path}/client.js`)).toBe(true);
    expect(fs.existsSync(`${compiler.server.webpackConfig.output.path}/server.js`)).toBe(true);
});

it('should throw if not idle', () => {
    const compiler = createCompiler(configClientBasic, configServerBasic);
    const promise = compiler.run().catch(() => {});

    expect(() => compiler.run()).toThrow(/\bidle\b/);
    expect(() => compiler.watch()).toThrow(/\bidle\b/);

    return promise;
});
