'use strict';

const path = require('path');
const pify = require('pify');
const rimraf = pify(require('rimraf'));
const webpackIsomorphicCompiler = require('../../');

const tmpDir = path.resolve(`${__dirname}/../tmp`);

let count = 0;
const compilers = [];

function replaceOutputPath(webpackConfig) {
    if (webpackConfig.output.path.indexOf(tmpDir) !== 0) {
        throw new Error(`\`webpackConfig.output.path\` must start with ${tmpDir}`);
    }

    webpackConfig = Object.assign({}, webpackConfig);
    webpackConfig.output = Object.assign({}, webpackConfig.output);
    webpackConfig.output.path = webpackConfig.output.path.replace(tmpDir, path.join(tmpDir, count.toString()));

    return webpackConfig;
}

// -----------------------------------------------------------

function createCompiler(clientWebpackConfig, serverWebpackConfig) {
    count += 1;

    clientWebpackConfig = replaceOutputPath(clientWebpackConfig);
    serverWebpackConfig = replaceOutputPath(serverWebpackConfig);

    const compiler = webpackIsomorphicCompiler(clientWebpackConfig, serverWebpackConfig);

    compilers.push(compiler);

    return compiler;
}

function teardown() {
    const promises = compilers.map((compiler) => {
        // Clear all listeners
        compiler
        .removeAllListeners()
        .on('error', () => {});

        // Unwatch
        return compiler.unwatch()
        // Wait for compilation.. just in case..
        .then(() => {
            if (!compiler.isCompiling()) {
                return;
            }

            return new Promise((resolve) => {
                compiler
                .on('end', () => resolve())
                .on('error', () => resolve());
            });
        });
    });

    return Promise.all(promises)
    // Remove temporary dir
    .then(
        () => rimraf(tmpDir),
        (err) => (
            rimraf(tmpDir)
            .then(
                () => { throw err; },
                (err_) => { throw err_; }
            )
        )
    );
}

module.exports = createCompiler;
module.exports.teardown = teardown;
