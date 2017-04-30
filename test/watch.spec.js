'use strict';

const pTry = require('p-try');
const fs = require('fs');
const Compiler = require('webpack/lib/Compiler');
const createCompiler = require('./util/createCompiler');
const configBasicClient = require('./configs/basic-client');
const configBasicServer = require('./configs/basic-server');
const configSyntaxError = require('./configs/syntax-error');

describe('.watch()', () => {
    afterEach(() => createCompiler.teardown());

    it('should call the handler everytime a file changes', (done) => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        let callsCount = 0;

        compiler.watch((err, stats) => {
            expect(err).toBe(null);
            expect(stats.client.toJson().assetsByChunkName).toEqual({ main: 'client.js' });
            expect(stats.server.toJson().assetsByChunkName).toEqual({ main: 'server.js' });

            callsCount += 1;

            if (callsCount === 2) {
                done();
            } else {
                fs.writeFileSync(configBasicClient.entry, fs.readFileSync(configBasicClient.entry));
            }
        });
    });

    it('should fail if one of the compilers fails', () => (
        pTry(() => new Promise((resolve) => {
            const compiler = createCompiler(configBasicClient, configSyntaxError);

            compiler.watch((err, stats) => {
                expect(err instanceof Error).toBe(true);
                expect(err.message).toMatch(/\bserver\b/);
                expect(stats).toBe(null);
                resolve();
            });
        }))
        .then(() => new Promise((resolve) => {
            const compiler = createCompiler(configSyntaxError, configBasicServer);

            compiler.watch((err, stats) => {
                expect(err instanceof Error).toBe(true);
                expect(err.message).toMatch(/\bclient\b/);
                expect(stats).toBe(null);
                resolve();
            });
        }))
    ));

    it('should fail if there\'s a fatal error', (done) => {
        const compiler = createCompiler(configBasicClient, configBasicServer);
        const contrivedError = new Error('foo');

        compiler.client.webpackCompiler.plugin('watch-run', (compiler, callback) => callback(contrivedError));

        compiler.watch((err) => {
            expect(err).toBe(contrivedError);
            done();
        });
    });

    it('should output both client & server assets', (done) => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        compiler.watch(() => {
            expect(fs.existsSync(`${compiler.client.webpackConfig.output.path}/client.js`)).toBe(true);
            expect(fs.existsSync(`${compiler.server.webpackConfig.output.path}/server.js`)).toBe(true);
            done();
        });
    });

    it('should wait for both compilers before resolving the promise, even if one fails', (done) => {
        let handlerCallsCount = 0;
        const originalWatch = Compiler.prototype.watch;

        Compiler.prototype.watch = function (options, handler) {
            return originalWatch.call(this, options, (...args) => {  // eslint-disable-line no-invalid-this
                handlerCallsCount += 1;
                handler(...args);
            });
        };

        const compiler = createCompiler(configBasicClient, configSyntaxError);

        compiler.watch(() => {
            Compiler.prototype.watch = originalWatch;
            expect(handlerCallsCount).toBe(2);
            done();
        });
    });

    describe('args', () => {
        it('should work with .watch()', (done) => {
            const compiler = createCompiler(configBasicClient, configBasicServer);

            compiler
            .on('end', () => done())
            .on('error', (err) => done.fail(err))
            .watch();
        });

        it('should work with .watch(options)', (done) => {
            const compiler = createCompiler(configBasicClient, configBasicServer);

            compiler
            .on('end', () => done())
            .on('error', (err) => done.fail(err))
            .watch();
        });

        it('should work with .watch(options, handler)', (done) => {
            const compiler = createCompiler(configBasicClient, configBasicServer);

            compiler.watch({}, (err) => {
                if (err) {
                    done.fail(err);
                } else {
                    done();
                }
            });
        });

        it('should work with .watch(handler)', (done) => {
            const compiler = createCompiler(configBasicClient, configBasicServer);

            compiler.watch((err) => {
                if (err) {
                    done.fail(err);
                } else {
                    done();
                }
            });
        });

        it('should throw if not idle', () => {
            const compiler = createCompiler(configBasicClient, configBasicServer);

            compiler.watch();

            expect(() => compiler.run()).toThrow(/\bidling\b/);
            expect(() => compiler.watch()).toThrow(/\bidling\b/);
        });
    });
});
