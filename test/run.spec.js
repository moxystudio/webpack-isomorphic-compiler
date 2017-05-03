'use strict';

const pTry = require('p-try');
const fs = require('fs');
const Compiler = require('webpack/lib/Compiler');
const createCompiler = require('./util/createCompiler');
const configClientBasic = require('./configs/client-basic');
const configServerBasic = require('./configs/server-basic');
const configClientSyntaxError = require('./configs/client-syntax-error');
const configServerSyntaxError = require('./configs/server-syntax-error');

describe('.run()', () => {
    afterEach(() => createCompiler.teardown());

    it('should fulfill with client & server stats', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

        return compiler.run()
        .then((stats) => {
            expect(stats.client.toJson().assetsByChunkName).toEqual({ main: 'client.js' });
            expect(stats.server.toJson().assetsByChunkName).toEqual({ main: 'server.js' });
        });
    });

    it('should fail if one of the compilers fails', () => (
        pTry(() => {
            const compiler = createCompiler(configClientBasic, configServerSyntaxError);

            return compiler.run()
            .then(() => {
                throw new Error('Should have failed');
            }, (err) => {
                expect(err instanceof Error).toBe(true);
                expect(err.message).toMatch(/\bserver-side\b/);
            });
        })
        .then(() => {
            const compiler = createCompiler(configClientSyntaxError, configServerBasic);

            return compiler.run()
            .then(() => {
                throw new Error('Should have failed');
            }, (err) => {
                expect(err instanceof Error).toBe(true);
                expect(err.message).toMatch(/\bclient-side\b/);
            });
        })
    ));

    it('should fail if there\'s a fatal error', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const contrivedError = new Error('foo');

        compiler.client.webpackCompiler.plugin('before-run', (compiler, callback) => {
            setImmediate(() => callback(contrivedError));
        });

        return compiler.run()
        .then(() => {
            throw new Error('Should have failed');
        }, (err) => {
            expect(err).toBe(contrivedError);
        });
    });

    it('should output both client & server assets', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

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

        const compiler = createCompiler(configClientBasic, configServerSyntaxError);

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
        const compiler = createCompiler(configClientBasic, configServerBasic);

        const promise = compiler.run()
        .catch(() => {});

        expect(() => compiler.run()).toThrow(/\bidling\b/);
        expect(() => compiler.watch()).toThrow(/\bidling\b/);

        return promise;
    });
});
