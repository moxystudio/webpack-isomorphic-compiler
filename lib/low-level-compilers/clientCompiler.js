'use strict';

const baseCompiler = require('./baseCompiler');

function clientCompiler(webpackConfig) {
    return baseCompiler('client', webpackConfig);
}

module.exports = clientCompiler;
