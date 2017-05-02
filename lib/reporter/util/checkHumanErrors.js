'use strict';

const chalk = require('chalk');

function checkServerConfig(compiler, reporterOptions) {
    const { webpackConfig } = compiler.server;
    let str;

    if (webpackConfig.target !== 'node') {
        str = `${chalk.yellow('WARN')}: Server target in webpack config should be set to \`node\``;
        str += 'See https://webpack.js.org/configuration/target/#target';
    }
    if (webpackConfig.output.libraryTarget !== 'this' && webpackConfig.output.libraryTarget !== 'commonjs2') {
        str = `${chalk.yellow('WARN')}: Server target in webpack config should be set to \`this\` or \`commonjs2\`\n`;
        str += 'See https://webpack.js.org/configuration/output/#output-librarytarget\n\n';
    }

    str && reporterOptions.output.write(str);
}

// -----------------------------------------------------------

function checkHumanErrors(compiler, reporterOptions) {
    // Check server configuration
    checkServerConfig(compiler, reporterOptions);
}

module.exports = checkHumanErrors;
