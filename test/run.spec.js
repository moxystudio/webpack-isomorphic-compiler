'use strict';

const pTry = require('p-try');
const fs = require('fs');
const Compiler = require('webpack/lib/Compiler');
const createCompiler = require('./util/createCompiler');
const configBasicClient = require('./configs/basic-client');
const configBasicServer = require('./configs/basic-server');
const configSyntaxError = require('./configs/syntax-error');

describe('.run()', () => {
    afterEach(() => createCompiler.teardown());

    it('should fulfill with client & server stats', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        return compiler.run()
        .then((stats) => {
            expect(stats.client.toJson().assetsByChunkName).toEqual({ main: 'client.js' });
            expect(stats.server.toJson().assetsByChunkName).toEqual({ main: 'server.js' });
        });
    });

    it('should fail if one of the compilers fails', () => (
        pTry(() => {
            const compiler = createCompiler(configBasicClient, configSyntaxError);

            return compiler.run()
            .then(() => {
                throw new Error('Should have failed');
            }, (err) => {
                expect(err instanceof Error).toBe(true);
                expect(err.message).toMatch(/\bserver\b/);
            });
        })
        .then(() => {
            const compiler = createCompiler(configSyntaxError, configBasicServer);

            return compiler.run()
            .then(() => {
                throw new Error('Should have failed');
            }, (err) => {
                expect(err instanceof Error).toBe(true);
                expect(err.message).toMatch(/\bclient\b/);
            });
        })
    ));

    it('should fail if there\'s a fatal error', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);
        const contrivedError = new Error('foo');

        compiler.client.webpackCompiler.plugin('before-run', (compiler, callback) => callback(contrivedError));

        return compiler.run()
        .then(() => {
            throw new Error('Should have failed');
        }, (err) => {
            expect(err).toBe(contrivedError);
        });
    });

    it('should output both client & server assets', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        return compiler.run()
        .then(() => {
            expect(fs.existsSync(`${compiler.client.webpackConfig.output.path}/client.js`)).toBe(true);
            expect(fs.existsSync(`${compiler.server.webpackConfig.output.path}/server.js`)).toBe(true);
        });
    });

    it('should wait for both compilers before resolving the promise, even if one fails', () => {
        let callbackCallsCount = 0;
        const originalRun = Compiler.prototype.run;

        Compiler.prototype.run = function (callback) {
            originalRun.call(this, (...args) => {  // eslint-disable-line no-invalid-this
                callbackCallsCount += 1;
                callback(...args);
            });
        };

        const compiler = createCompiler(configBasicClient, configSyntaxError);

        return compiler.run()
        .then(() => {
            Compiler.prototype.run = originalRun;
            throw new Error('Should have failed');
        }, () => {
            Compiler.prototype.run = originalRun;
            expect(callbackCallsCount).toBe(2);
        });
    });

    it('should throw if not idle', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        const promise = compiler.run()
        .catch(() => {});

        expect(() => compiler.run()).toThrow(/\bidling\b/);
        expect(() => compiler.watch()).toThrow(/\bidling\b/);

        return promise;
    });
});