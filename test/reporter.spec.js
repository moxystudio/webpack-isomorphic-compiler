'use strict';

const WritableStream = require('stream').Writable;
const fs = require('fs');
const escapeRegExp = require('lodash.escaperegexp');
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
            // Remove any file sizes
            .replace(/\d+\.\d+\skB/g, 'x.xx kB')
            // Remove absolute directory references
            .replace(new RegExp(escapeRegExp(process.cwd()), 'g'), '')
            // Normalize stack traces done by pretty-error
            .replace(new RegExp(`${escapeRegExp('    [0m')}.+`, 'g'), '    [stack]')
            .replace(/(\s{4}\[stack\])([\s\S]+\[stack\])*/, '$1');
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

    it('should not display stats if options.stats = false', (done) => {
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

        compiler.client.webpackCompiler.plugin('before-run', (compiler, callback) => {
            setImmediate(() => callback(contrivedError));
        });

        return compiler.run({
            report: { output: outputStream },
        })
        .catch(() => {})
        .then(() => {
            expect(outputStream.getOutput()).toMatchSnapshot();
        });
    });

    it('should report a ENOENT error while compiling, hiding the stack', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);
        const outputStream = createInMemoryOutputStream();
        const contrivedError = Object.assign(new Error('foo'), { code: 'ENOENT', hideStack: true });

        compiler.client.webpackCompiler.plugin('before-run', (compiler, callback) => {
            setImmediate(() => callback(contrivedError));
        });

        return compiler.run({
            report: { output: outputStream },
        })
        .catch(() => {})
        .then(() => {
            expect(outputStream.getOutput()).toMatchSnapshot();
        });
    });

    it('should report a TypeError error while compiling', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);
        const outputStream = createInMemoryOutputStream();
        const contrivedError = Object.assign(new TypeError('foo'));

        compiler.client.webpackCompiler.plugin('before-run', (compiler, callback) => {
            setImmediate(() => callback(contrivedError));
        });

        return compiler.run({
            report: { output: outputStream },
        })
        .catch(() => {})
        .then(() => {
            expect(outputStream.getOutput()).toMatchSnapshot();
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

    it('should dispose the created reporter if .run() throws', () => {
        const compiler = createCompiler(configBasicClient, configBasicServer);
        const outputStream = createInMemoryOutputStream();

        const promise = compiler.run({
            report: { stats: true, statsOptions: { hash: true }, output: outputStream },
        })
        .then(() => {
            expect(outputStream.getOutput()).toMatchSnapshot();
        });

        expect(() => compiler.run({
            report: { stats: true, statsOptions: { hash: true }, output: outputStream },
        })).toThrow(/\bidling\b/);

        return promise;
    });

    it('should dispose the created reporter if .watch() throws', (done) => {
        const compiler = createCompiler(configBasicClient, configBasicServer);
        const outputStream = createInMemoryOutputStream();

        compiler.watch({
            report: { stats: true, statsOptions: { hash: true }, output: outputStream },
        }, () => {
            expect(outputStream.getOutput()).toMatchSnapshot();
            done();
        });

        expect(() => compiler.watch({
            report: { stats: true, statsOptions: { hash: true }, output: outputStream },
        })).toThrow(/\bidling\b/);
    });
});
