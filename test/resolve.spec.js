'use strict';

const pSettle = require('p-settle');
const createCompiler = require('./util/createCompiler');
const configClientBasic = require('./configs/client-basic');
const configServerBasic = require('./configs/server-basic');
const configClientSyntaxError = require('./configs/client-syntax-error');

describe('.resolve()', () => {
    afterEach(() => createCompiler.teardown());

    it('should fulfill immediately if the compiler has stats', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

        return compiler.run()
        .then((stats) => (
            compiler.resolve()
            .then((resolvedStats) => {
                expect(resolvedStats).toBe(stats);
            })
        ));
    });

    it('should reject immediately if the compiler has an error', () => {
        const compiler = createCompiler(configClientSyntaxError, configServerBasic);

        return compiler.run()
        .then(() => {
            throw new Error('Should have failed');
        }, (err) => (
            compiler.resolve()
            .then(() => {
                throw new Error('Should have failed');
            }, (resolvedErr) => {
                expect(resolvedErr).toBe(err);
            })
        ));
    });

    it('should wait and fulfill after a successful compilation', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

        return Promise.all([
            compiler.run(),
            compiler.resolve(),
        ])
        .then(([stats, resolvedStats]) => {
            expect(resolvedStats).toBe(stats);
        });
    });

    it('should wait and reject after a failed compilation', () => {
        const compiler = createCompiler(configClientSyntaxError, configServerBasic);

        return pSettle([
            compiler.run(),
            compiler.resolve(),
        ])
        .then(([stats, resolvedStats]) => {
            expect(stats.isRejected).toBe(true);
            expect(resolvedStats.isRejected).toBe(true);
            expect(stats.reason).toBe(resolvedStats.reason);
        });
    });
});
