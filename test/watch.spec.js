'use strict';

const fs = require('fs');
const pTry = require('p-try');
const Compiler = require('webpack/lib/Compiler');
const createCompiler = require('./util/createCompiler');
const configClientBasic = require('./configs/client-basic');
const configServerBasic = require('./configs/server-basic');
const configClientSyntaxError = require('./configs/client-syntax-error');
const configServerSyntaxError = require('./configs/server-syntax-error');

describe('.watch()', () => {
    afterEach(() => createCompiler.teardown());

    it('should call the handler everytime a file changes', (done) => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

        let callsCount = 0;

        compiler.watch((err, stats) => {
            expect(err).toBe(null);
            expect(stats.client.toJson().assetsByChunkName).toEqual({ main: 'client.js' });
            expect(stats.server.toJson().assetsByChunkName).toEqual({ main: 'server.js' });

            callsCount += 1;

            if (callsCount === 2) {
                done();
            } else {
                fs.writeFileSync(configClientBasic.entry, fs.readFileSync(configClientBasic.entry));
            }
        });
    });

    it('should fail if one of the compilers fails', () => (
        pTry(() => new Promise((resolve) => {
            const compiler = createCompiler(configClientBasic, configServerSyntaxError);

            compiler.watch((err, stats) => {
                expect(err instanceof Error).toBe(true);
                expect(err.message).toMatch(/\bserver-side\b/);
                expect(stats).toBe(null);
                resolve();
            });
        }))
        .then(() => new Promise((resolve) => {
            const compiler = createCompiler(configClientSyntaxError, configServerBasic);

            compiler.watch((err, stats) => {
                expect(err instanceof Error).toBe(true);
                expect(err.message).toMatch(/\bclient-side\b/);
                expect(stats).toBe(null);
                resolve();
            });
        }))
    ));

    // This test must be skipped until https://github.com/webpack/webpack/pull/4828 lands
    it.skip('should fail if there\'s a fatal error', (done) => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const contrivedError = new Error('foo');

        compiler.client.webpackCompiler.plugin('watch-run', (compiler, callback) => callback(contrivedError));

        compiler.watch((err) => {
            expect(err).toBe(contrivedError);
            done();
        });
    });

    it('should output both client & server assets', (done) => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

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

        const compiler = createCompiler(configClientBasic, configServerSyntaxError);

        compiler.watch(() => {
            Compiler.prototype.watch = originalWatch;
            expect(handlerCallsCount).toBe(2);
            done();
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
            .watch();
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

            expect(() => compiler.run()).toThrow(/\bidling\b/);
            expect(() => compiler.watch()).toThrow(/\bidling\b/);
        });
    });
});
