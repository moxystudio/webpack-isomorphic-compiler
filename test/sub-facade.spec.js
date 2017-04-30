'use strict';

const createCompiler = require('./util/createCompiler');
const configBasicClient = require('./configs/basic-client');
const configBasicServer = require('./configs/basic-server');

describe('misc', () => {
    afterEach(() => createCompiler.teardown());

    it('should give access to client & server webpack compiler & config', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        ['client', 'server'].forEach((type) => {
            expect(compiler[type]).toBeDefined();
            expect(typeof compiler[type].webpackConfig).toBe('object');
            expect(typeof compiler[type].webpackConfig.output).toBe('object');
            expect(typeof compiler[type].webpackCompiler).toBe('object');
            expect(typeof compiler[type].webpackCompiler.plugin).toBe('function');
        });
    });

    it('should prevent direct access to webpack compilers main methods', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);

        expect(() => {
            compiler.client.webpackCompiler.run(() => {});
        }).toThrow(/\bpublic API\b/);
    });
});
