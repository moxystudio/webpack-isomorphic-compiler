'use strict';

const webpack = require('webpack');
const isomorphicCompiler = require('../');
const createCompiler = require('./util/createCompiler');
const configClientBasic = require('./configs/client-basic');
const configServerBasic = require('./configs/server-basic');

describe('misc', () => {
    afterEach(() => createCompiler.teardown());

    it('should give access to client & server webpack compiler & config', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

        ['client', 'server'].forEach((type) => {
            expect(compiler[type]).toBeDefined();
            expect(typeof compiler[type].webpackConfig).toBe('object');
            expect(typeof compiler[type].webpackConfig.output).toBe('object');
            expect(typeof compiler[type].webpackCompiler).toBe('object');
            expect(typeof compiler[type].webpackCompiler.createCompilation).toBe('function');
        });
    });

    it('should prevent direct access to webpack compilers main methods', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);

        expect(() => {
            compiler.client.webpackCompiler.run(() => {});
        }).toThrow(/\bpublic API\b/);
    });

    it('should allow passing compilers instead of configs', async () => {
        const clientCompiler = webpack(createCompiler.prepareConfig(configClientBasic));
        const serverCompiler = webpack(createCompiler.prepareConfig(configServerBasic));
        const compiler = isomorphicCompiler(clientCompiler, serverCompiler);

        createCompiler.push(compiler);

        const { clientStats, serverStats } = await compiler.run();

        expect(clientStats.toJson().assetsByChunkName).toEqual({ main: 'client.js' });
        expect(serverStats.toJson().assetsByChunkName).toEqual({ main: 'server.js' });
    });
});
