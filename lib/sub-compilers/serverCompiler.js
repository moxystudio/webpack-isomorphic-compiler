'use strict';

const baseCompiler = require('./baseCompiler');
const path = require('path');

function getServerFile(webpackConfig, stats) {
    const statsJson = stats.toJson({ chunks: false, modules: false, children: false, assets: false });

    for (const key in statsJson.entrypoints) {
        return `${webpackConfig.output.path}/${statsJson.entrypoints[key].assets[0]}`;
    }

    throw new Error('Unable to get built server file');
}

function preEnd(webpackConfig, result) {
    // Get the stuff exported by the server file by requiring it
    const serverFile = getServerFile(webpackConfig, result.stats);

    // Delete from the require cache
    delete require.cache[serverFile];

    try {
        result.exports = require(serverFile);  // eslint-disable-line global-require
    } catch (err) {
        // If it fails to require the bundle, the compilation will fail
        // We are just adding some more extra info
        err.detail = 'This error happened while trying to require the built server file:\n';
        err.detail += path.relative('', serverFile);
        throw err;
    }
}

// -----------------------------------------------------------

function serverCompiler(webpackConfig) {
    return baseCompiler('server', webpackConfig, {
        preEnd: (result) => preEnd(webpackConfig, result),
    });
}

module.exports = serverCompiler;
