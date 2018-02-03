'use strict';

const fs = require('fs');
const createCompiler = require('./util/createCompiler');
const touchFile = require('./util/touchFile');
const configClientBasic = require('./configs/client-basic');
const configServerBasic = require('./configs/server-basic');
const configClientSyntaxError = require('./configs/client-syntax-error');
const configServerSyntaxError = require('./configs/server-syntax-error');

afterEach(() => createCompiler.teardown());

it('should call the handler everytime a file changes', (done) => {
    const compiler = createCompiler(configClientBasic, configServerBasic);
    let callsCount = 0;

    compiler.watch((err, compilation) => {
        expect(err).toBe(null);

        const { clientStats, serverStats, stats, duration } = compilation;

        expect(clientStats.toJson().assetsByChunkName).toEqual({ main: 'client.js' });
        expect(serverStats.toJson().assetsByChunkName).toEqual({ main: 'server.js' });
        expect(typeof duration).toBe('number');
        expect(stats).toBe(clientStats);

        callsCount += 1;

        if (callsCount === 2) {
            done();
        } else {
            touchFile(configClientBasic.entry);
        }
    });
});

it('should fail if the compiler fails', async () => {
    await new Promise((resolve) => {
        const compiler = createCompiler(configClientBasic, configServerSyntaxError);

        compiler.watch((err, compilation) => {
            expect(err instanceof Error).toBe(true);
            expect(err.message).toBe('Webpack compilation failed (server)');
            expect(compilation).toBe(null);

            resolve();
        });
    });

    await new Promise((resolve) => {
        const compiler = createCompiler(configClientSyntaxError, configServerBasic);

        compiler.watch((err, compilation) => {
            expect(err instanceof Error).toBe(true);
            expect(err.message).toBe('Webpack compilation failed (client)');
            expect(compilation).toBe(null);

            resolve();
        });
    });
});

it('should fail if there\'s a fatal error', (done) => {
    const compiler = createCompiler(configClientBasic, configServerBasic);
    const contrivedError = new Error('foo');

    compiler.client.webpackCompiler.plugin('watch-run', (compiler, callback) => callback(contrivedError));

    compiler.watch((err) => {
        expect(err).toBe(contrivedError);

        done();
    });
});

it('should output assets', (done) => {
    const compiler = createCompiler(configClientBasic, configServerBasic);

    compiler.watch(() => {
        expect(fs.existsSync(`${compiler.client.webpackConfig.output.path}/client.js`)).toBe(true);
        expect(fs.existsSync(`${compiler.server.webpackConfig.output.path}/server.js`)).toBe(true);

        done();
    });
});

describe('invalidate', () => {
    it('should return a function that can be used to invalidate and retrigger a compilation', (done) => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const logEvent = jest.fn();

        compiler.once('begin', () => setImmediate(() => invalidate()));
        compiler.on('begin', () => logEvent('begin'));
        compiler.on('invalidate', () => logEvent('invalidate'));
        compiler.on('end', () => logEvent('end'));

        const invalidate = compiler.watch(() => {
            const loggedEvents = logEvent.mock.calls.reduce((results, [event]) => [...results, event], []);

            expect(loggedEvents).toEqual(['begin', 'invalidate', 'begin', 'end']);

            done();
        });
    });
});

describe('args', () => {
    it('should work with .watch()', (done) => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

        compiler
        .on('end', () => done())
        .on('error', (err) => done.fail(err))
        .watch();
    });

    it('should work with .watch(options)', (done) => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

        compiler
        .on('end', () => done())
        .on('error', (err) => done.fail(err))
        .watch({ poll: true });
    });

    it('should work with .watch(options, handler)', (done) => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

        compiler.watch({}, (err) => {
            if (err) {
                done.fail(err);
            } else {
                done();
            }
        });
    });

    it('should work with .watch(handler)', (done) => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

        compiler.watch((err) => {
            if (err) {
                done.fail(err);
            } else {
                done();
            }
        });
    });

    it('should throw if not idle', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

        compiler.watch();

        expect(() => compiler.run()).toThrow(/\bidle\b/);
        expect(() => compiler.watch()).toThrow(/\bidle\b/);
    });
});
