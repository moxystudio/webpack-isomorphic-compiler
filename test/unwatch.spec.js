'use strict';

const fs = require('fs');
const delay = require('delay');
const createCompiler = require('./util/createCompiler');
const configBasicClient = require('./configs/basic-client');
const configBasicServer = require('./configs/basic-server');

describe('.watch()', () => {
    afterEach(() => createCompiler.teardown());

    it('should stop watching changes (sync)', (done) => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        let callsCount = 0;

        const unwatchPromise = compiler
        .watch(() => { callsCount += 1; })
        .unwatch();

        return Promise.all([unwatchPromise, delay(2000)])
        .then(() => {
            expect(callsCount).toBe(0);
            done();
        });
    });

    it('should stop watching changes (async)', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        let callsCount = 0;

        // Watch changes & wait
        // When done, unwatch & modify files
        return new Promise((resolve) => {
            compiler.watch(() => {
                callsCount += 1;

                if (callsCount === 1) {
                    resolve(
                        compiler.unwatch()
                        .then(() => fs.writeFileSync(configBasicClient.entry, fs.readFileSync(configBasicClient.entry)))
                    );
                }
            });
        })
        // At this point, `callsCount` should remain 1
        .then(() => (
            delay(2000)
            .then(() => {
                expect(callsCount).toBe(1);
            })
        ));
    });

    it('should return a promise', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        compiler.watch();

        const promise = compiler.unwatch();

        expect(promise).toBeDefined();
        expect(typeof promise.then).toBe('function');
    });

    it('should resolve all promises returned by unwatch if it gets called multiple times', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        compiler.watch();

        const promises = [compiler.unwatch(), compiler.unwatch()];

        return Promise.all([promises]);
    });

    it('should not crash if not watching', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        return compiler.unwatch();
    });
});
