'use strict';

const PrettyError = require('pretty-error');
const chalk = require('chalk');
const indentString = require('indent-string');
const merge = require('lodash.merge');
const checkHumanErrors = require('./util/checkHumanErrors');

// Symbols table
// On windows we hav to use more simple symbols otherwise they won't display correctly
const symbols = process.platform !== 'win32' ?
{
    ok: '✓',
    fail: '✖',
    bullet: '•',
    hr: '━',
} :
/* istanbul ignore next */
{
    ok: '√',
    fail: '×',
    bullet: '*',
    hr: '━',
};

// Configure prettyError instance
const prettyError = new PrettyError();

prettyError.appendStyle({
    'pretty-error > header': {
        display: 'none',
    },
    'pretty-error > trace': {
        marginTop: 0,
    },
    'pretty-error > trace > item': {
        marginBottom: 0,
    },
});

function calculateDuration(clientStats, serverStats) {
    return Math.max(
        clientStats.endTime - clientStats.startTime,
        serverStats.endTime - serverStats.endTime
    );
}

function renderGenericError(err) {
    let str = '';

    if (err.code || (err.name && err.name !== 'Error')) {
        str += chalk.dim(`${err.code || err.name}: `);
    }

    str += `${err.message}\n`;

    if (!err.hideStack) {
        const prettyErrStr = prettyError
        .render(err)
        .trim()
        .split('\n')
        .slice(0, -1)
        .join('\n');

        str += `${prettyErrStr}\n`;
    }

    return str;
}

function renderError(err) {
    let str;

    // If there's stats, render them
    if (err.stats) {
        str = `${err.message}\n\n`;
        str += renderStats(err.stats, { assets: false });
    // Render standard error
    } else {
        str = renderGenericError(err);
    }

    return str;
}

function renderStats(stats, options) {
    options = Object.assign({
        assets: true,
        chunks: false,
        version: false,
        children: false,
        modules: false,
        colors: true,
        timings: false,
        hash: false,
    }, options);

    return `${stats.toString(options).trim()}\n`;
}

function renderBanner(label) {
    let str = '';

    str += chalk.inverse(` ${label} ${' '.repeat(35 - label.length - 1)}`);
    str += '\n';
    str += chalk.dim(symbols.hr.repeat(35));
    str += '\n';

    return str;
}

// -----------------------------------------------------------

function getOptions(options) {
    return merge({
        humanErrors: true,  // Display human errors
        stats: true, // Display output assets, can be `true`, `false` and `once`
        statsOptions: {  // Stats object to use for stats.toString(),
            assets: true,
            chunks: false,
            version: false,
            children: false,
            modules: false,
            timings: false,
            hash: false,
            colors: chalk.enabled,
        },
        output: process.stderr,  // Writable stream to print stuff
    }, options);
}

function reporter(compiler, options) {
    options = getOptions(options);

    let displayStats = options.stats === true || options.stats === 'once';

    function onBeginOnce() {
        checkHumanErrors(compiler, options);
    }

    function onBegin() {
        const str = `${chalk.dim(symbols.bullet)} Compiling...\n`;

        options.output.write(str);
    }

    function onEnd({ client, server }) {
        let str;

        str = `${chalk.green(symbols.ok)} Compilation succeeded`;
        str += ` ${chalk.dim(`(${calculateDuration(client, server)}ms)`)}\n\n`;

        options.output.write(str);

        if (displayStats) {
            if (options.stats === 'once') {
                displayStats = false;
            }

            str = '';
            str += renderBanner('CLIENT');
            str += renderStats(client, options.statsOptions);
            str += '\n';
            str += renderBanner('SERVER');
            str += renderStats(server, options.statsOptions);
            str += '\n';

            options.output.write(indentString(str, 4));
        }
    }

    function onError(err) {
        let str;

        str = '';
        str += `${chalk.red(symbols.fail)} Compilation failed\n\n`;
        str += indentString(renderError(err), 4);
        str += '\n';

        options.output.write(str);
    }

    compiler
    .once('begin', onBeginOnce)
    .on('begin', onBegin)
    .on('end', onEnd)
    .on('error', onError);

    return () => {
        compiler
        .removeListener('begin', onBeginOnce)
        .removeListener('begin', onBegin)
        .removeListener('end', onEnd)
        .removeListener('error', onError);
    };
}

module.exports = reporter;
module.exports.getOptions = getOptions;
module.exports.renderStats = renderStats;
module.exports.renderError = renderError;
