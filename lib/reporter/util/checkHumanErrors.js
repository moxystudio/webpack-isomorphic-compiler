'use strict';

const chalk = require('chalk');

function checkServerConfig(compiler, reporterOptions) {
    const { webpackConfig } = compiler.server;
    let str = '';

    if (webpackConfig.target !== 'node') {
        str += `${chalk.yellow('WARN')}: Server \`output.target\` in webpack config should be set to \`node\`\n`;
        str += 'See https://webpack.js.org/configuration/target/#target\n';
    }
    if (webpackConfig.output.libraryTarget !== 'this' && webpackConfig.output.libraryTarget !== 'commonjs2') {
        str += `${chalk.yellow('WARN')}: Server \`output.libraryTarget\` in webpack config should be set to \`this\` or \`commonjs2\`\n`;
        str += 'See https://webpack.js.org/configuration/output/#output-librarytarget\n';
    }

    if (webpackConfig.devtool && webpackConfig.devtool !== 'source-map' && webpackConfig.devtool !== 'inline-source-map') {
        str += `${chalk.yellow('WARN')}: Server \`devtool\` in webpack config should be set to \`source-map\` or \`inline-source-map\`\n`;
        str += 'In addition, you must use https://github.com/evanw/node-source-map-support to enable source maps.\n';
    }

    str && reporterOptions.output.write(`${str}\n`);
}

// -----------------------------------------------------------

function checkHumanErrors(compiler, reporterOptions) {
    // Check server configuration
    checkServerConfig(compiler, reporterOptions);
}

module.exports = checkHumanErrors;
