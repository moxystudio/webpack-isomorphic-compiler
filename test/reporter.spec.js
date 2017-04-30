'use strict';

const WritableStream = require('stream').Writable;
const fs = require('fs');
const createCompiler = require('./util/createCompiler');
const configBasicClient = require('./configs/basic-client');
const configBasicServer = require('./configs/basic-server');
const configSyntaxError = require('./configs/syntax-error');

function createInMemoryOutputStream() {
    let output = '';
    const writableStream = new WritableStream();

    return Object.assign(writableStream, {
        _write(chunk, encoding, callback) {
            output += chunk;
            callback();
        },

        getOutput() {
            return output
            // Replace (xxxms) with (10ms)
            .replace(/\(\d+ms\)/g, '(10ms)')
            // Remove trailing spaces in new lines (webpack toString adds a few..)
            .split('\n')
            .map((line) => line.trimRight())
            .join('\n');
        },
    });
}

describe('reporter', () => {
    afterEach(() => createCompiler.teardown());

    it('should report a successful compilation', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);
        const outputStream = createInMemoryOutputStream();

        return compiler.run({
            report: { output: outputStream },
        })
        .then(() => {
            expect(outputStream.getOutput()).toMatchSnapshot();
        });
    });

    it('should report a failed compilation', () => {
        const compiler = createCompiler(configBasicClient, configSyntaxError);
        const outputStream = createInMemoryOutputStream();

        return compiler.run({
            report: { output: outputStream },
        })
        .catch(() => {})
        .then(() => {
            expect(outputStream.getOutput()).toMatchSnapshot();
        });
    });

    it('should report a fatal error while compiling', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);
        const outputStream = createInMemoryOutputStream();
        const contrivedError = new Error('foo');

        compiler.client.webpackCompiler.plugin('before-run', (compiler, callback) => callback(contrivedError));

        return compiler.run({
            report: { output: outputStream },
        })
        .catch(() => {})
        .then(() => {
            expect(outputStream.getOutput()).toMatchSnapshot();
        });
    });

    it('should only display stats in the first compilation if options.stats = \'once\'', (done) => {
        const compiler = createCompiler(configBasicClient, configBasicServer);
        const outputStream = createInMemoryOutputStream();
        let callsCount = 0;

        return compiler.watch({
            report: { stats: 'once', output: outputStream },
        }, () => {
            callsCount += 1;

            if (callsCount === 1) {
                fs.writeFileSync(configBasicClient.entry, fs.readFileSync(configBasicClient.entry));
            } else {
                expect(outputStream.getOutput()).toMatchSnapshot();
                done();
            }
        });
    });

    it('should use options.statsOptions when printing stats', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);
        const outputStream = createInMemoryOutputStream();

        return compiler.run({
            report: { stats: true, statsOptions: { hash: true }, output: outputStream },
        })
        .then(() => {
            expect(outputStream.getOutput()).toMatchSnapshot();
        });
    });
});
