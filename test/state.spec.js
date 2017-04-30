'use strict';

const createCompiler = require('./util/createCompiler');
const configBasicClient = require('./configs/basic-client');
const configBasicServer = require('./configs/basic-server');
const configSyntaxError = require('./configs/syntax-error');

describe('state', () => {
    afterEach(() => createCompiler.teardown());

    it('should have correct state before and after a successful run', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        expect(compiler.isCompiling()).toBe(false);
        expect(compiler.getError()).toBe(null);
        expect(compiler.getStats()).toBe(null);

        const promise = compiler.run()
        .then((stats) => {
            expect(stats).toBeDefined();
            expect(compiler.isCompiling()).toBe(false);
            expect(compiler.getError()).toBe(null);
            expect(compiler.getStats()).toBe(stats);
        });

        expect(compiler.isCompiling()).toBe(true);
        expect(compiler.getError()).toBe(null);
        expect(compiler.getStats()).toBe(null);

        return promise;
    });

    it('should have correct state before and after a failed run', () => {
        const compiler = createCompiler(configBasicClient, configSyntaxError);

        expect(compiler.isCompiling()).toBe(false);
        expect(compiler.getError()).toBe(null);
        expect(compiler.getStats()).toBe(null);

        compiler.run()
        .then(() => {
            throw new Error('Should have failed');
        }, (err) => {
            expect(err).toBeDefined();
            expect(compiler.isCompiling()).toBe(false);
            expect(compiler.getError()).toBe(err);
            expect(compiler.getStats()).toBe(null);
        });

        expect(compiler.isCompiling()).toBe(true);
        expect(compiler.getError()).toBe(null);
        expect(compiler.getStats()).toBe(null);
    });

    it('should have correct state before and after a successful watch run', (done) => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        expect(compiler.isCompiling()).toBe(false);
        expect(compiler.getError()).toBe(null);
        expect(compiler.getStats()).toBe(null);

        compiler.watch((err, stats) => {
            expect(err).toBe(null);
            expect(stats).toBeDefined();
            expect(compiler.isCompiling()).toBe(false);
            expect(compiler.getError()).toBe(err);
            expect(compiler.getStats()).toBe(stats);
            done();
        });

        expect(compiler.isCompiling()).toBe(true);  // Takes some time to start compiling
        expect(compiler.getError()).toBe(null);
        expect(compiler.getStats()).toBe(null);
    });

    it('should have correct state before and after a failed watch run', (done) => {
        const compiler = createCompiler(configBasicClient, configSyntaxError);

        expect(compiler.isCompiling()).toBe(false);
        expect(compiler.getError()).toBe(null);
        expect(compiler.getStats()).toBe(null);

        compiler.watch((err, stats) => {
            expect(err).toBeDefined();
            expect(stats).toBe(null);
            expect(compiler.isCompiling()).toBe(false);
            expect(compiler.getError()).toBe(err);
            expect(compiler.getStats()).toBe(null);
            done();
        });

        expect(compiler.isCompiling()).toBe(true);  // Takes some time to start compiling
        expect(compiler.getError()).toBe(null);
        expect(compiler.getStats()).toBe(null);
    });
});
