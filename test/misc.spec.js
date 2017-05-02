'use strict';

const createCompiler = require('./util/createCompiler');
const configServerClient = require('./configs/client-basic');
const configServerBasic = require('./configs/server-basic');

describe('misc', () => {
    afterEach(() => createCompiler.teardown());

    it('should give access to client & server webpack compiler & config', () => {
        const compiler = createCompiler(configServerClient, configServerBasic);

        ['client', 'server'].forEach((type) => {
            expect(compiler[type]).toBeDefined();
            expect(typeof compiler[type].webpackConfig).toBe('object');
            expect(typeof compiler[type].webpackConfig.output).toBe('object');
            expect(typeof compiler[type].webpackCompiler).toBe('object');
            expect(typeof compiler[type].webpackCompiler.plugin).toBe('function');
        });
    });

    it('should prevent direct access to webpack compilers main methods', () => {
        const compiler = createCompiler(configServerClient, configServerBasic);

        expect(() => {
            compiler.client.webpackCompiler.run(() => {});
        }).toThrow(/\bpublic API\b/);
    });
});
