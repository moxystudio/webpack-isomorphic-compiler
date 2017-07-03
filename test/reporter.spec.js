'use strict';

const fs = require('fs');
const merge = require('lodash.merge');
const webpackIsomorphicCompiler = require('../');
const createCompiler = require('./util/createCompiler');
const createOutputStream = require('./util/createOutputStream');
const configClientBasic = require('./configs/client-basic');
const configServerBasic = require('./configs/server-basic');
const configServerSyntaxError = require('./configs/server-syntax-error');

describe('reporter', () => {
    afterEach(() => createCompiler.teardown());

    it('should report a successful compilation', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const outputStream = createOutputStream();

        return compiler.run({
            report: { output: outputStream },
        })
        .then(() => {
            expect(outputStream.getReportOutput()).toMatchSnapshot();
        });
    });

    it('should only display stats in the first compilation if options.stats = \'once\'', (done) => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const outputStream = createOutputStream();
        let callsCount = 0;

        return compiler.watch({
            report: { stats: 'once', output: outputStream },
        }, () => {
            callsCount += 1;

            if (callsCount === 1) {
                fs.writeFileSync(configClientBasic.entry, fs.readFileSync(configClientBasic.entry));
            } else {
                expect(outputStream.getReportOutput()).toMatchSnapshot();
                done();
            }
        });
    });

    it('should not display stats if options.stats = false', (done) => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const outputStream = createOutputStream();
        let callsCount = 0;

        return compiler.watch({
            report: { stats: 'once', output: outputStream },
        }, () => {
            callsCount += 1;

            if (callsCount === 1) {
                fs.writeFileSync(configClientBasic.entry, fs.readFileSync(configClientBasic.entry));
            } else {
                expect(outputStream.getReportOutput()).toMatchSnapshot();
                done();
            }
        });
    });

    it('should report a failed compilation', () => {
        const compiler = createCompiler(configClientBasic, configServerSyntaxError);
        const outputStream = createOutputStream();

        return compiler.run({
            report: { output: outputStream },
        })
        .catch(() => {})
        .then(() => {
            expect(outputStream.getReportOutput()).toMatchSnapshot();
        });
    });

    it('should report a fatal error while compiling', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const outputStream = createOutputStream();
        const contrivedError = new Error('foo');

        compiler.client.webpackCompiler.plugin('before-run', (compiler, callback) => {
            setImmediate(() => callback(contrivedError));
        });

        return compiler.run({
            report: { output: outputStream },
        })
        .catch(() => {})
        .then(() => {
            expect(outputStream.getReportOutput()).toMatchSnapshot();
        });
    });

    it('should report a ENOENT error while compiling, hiding the stack', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const outputStream = createOutputStream();
        const contrivedError = Object.assign(new Error('foo'), { code: 'ENOENT', hideStack: true });

        compiler.client.webpackCompiler.plugin('before-run', (compiler, callback) => {
            setImmediate(() => callback(contrivedError));
        });

        return compiler.run({
            report: { output: outputStream },
        })
        .catch(() => {})
        .then(() => {
            expect(outputStream.getReportOutput()).toMatchSnapshot();
        });
    });

    it('should report a TypeError error while compiling', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const outputStream = createOutputStream();
        const contrivedError = Object.assign(new TypeError('foo'));

        compiler.client.webpackCompiler.plugin('before-run', (compiler, callback) => {
            setImmediate(() => callback(contrivedError));
        });

        return compiler.run({
            report: { output: outputStream },
        })
        .catch(() => {})
        .then(() => {
            expect(outputStream.getReportOutput()).toMatchSnapshot();
        });
    });

    it('should use options.statsOptions when printing stats', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const outputStream = createOutputStream();

        return compiler.run({
            report: { stats: true, statsOptions: { hash: true }, output: outputStream },
        })
        .then(() => {
            expect(outputStream.getReportOutput()).toMatchSnapshot();
        });
    });

    it('should dispose the created reporter if .run() throws', () => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const outputStream = createOutputStream();

        const promise = compiler.run({
            report: { stats: true, output: outputStream },
        })
        .then(() => {
            expect(outputStream.getReportOutput()).toMatchSnapshot();
        });

        expect(() => compiler.run({
            report: { stats: true, output: outputStream },
        })).toThrow(/\bidling\b/);

        return promise;
    });

    it('should dispose the created reporter if .watch() throws', (done) => {
        const compiler = createCompiler(configClientBasic, configServerBasic);
        const outputStream = createOutputStream();

        compiler.watch({
            report: { stats: true, output: outputStream },
        }, () => {
            expect(outputStream.getReportOutput()).toMatchSnapshot();
            done();
        });

        expect(() => compiler.watch({
            report: { stats: true, output: outputStream },
        })).toThrow(/\bidling\b/);
    });

    it('should calculate duration correctly if only one of the compilers actually run');

    describe('human errors', () => {
        it('should warn about all human errors', () => {
            const badServerConfig = merge({}, configClientBasic, {
                devtool: 'eval-source-map',
            });

            const compiler = createCompiler(configClientBasic, badServerConfig);
            const outputStream = createOutputStream();

            return compiler.run({
                report: { output: outputStream },
            })
            .catch(() => {})
            .then(() => {
                expect(outputStream.getReportOutput()).toMatchSnapshot();
            });
        });

        it('should not warn about human errors if options.humanErrors = false', () => {
            const compiler = createCompiler(configClientBasic, configClientBasic);
            const outputStream = createOutputStream();

            return compiler.run({
                report: { humanErrors: false, output: outputStream },
            })
            .catch(() => {})
            .then(() => {
                expect(outputStream.getReportOutput()).toMatchSnapshot();
            });
        });
    });

    describe('exports', () => {
        it('should be exported in the main module', () => {
            expect(typeof webpackIsomorphicCompiler.reporter).toBe('function');
        });

        it('should export renderStats(), renderError() and getOptions()', () => {
            expect(typeof webpackIsomorphicCompiler.reporter.renderStats).toBe('function');
            expect(typeof webpackIsomorphicCompiler.reporter.renderError).toBe('function');
            expect(typeof webpackIsomorphicCompiler.reporter.getOptions).toBe('function');
        });

        it('should support renderStats() without statsOptions', () => {
            const compiler = createCompiler(configClientBasic, configServerBasic);
            const outputStream = createOutputStream();

            return compiler.run({
                report: { output: outputStream },
            })
            .then((stats) => {
                const renderedStats = webpackIsomorphicCompiler.reporter.renderStats(stats.client);

                expect(createOutputStream.normalizeReporterOutput(renderedStats)).toMatchSnapshot();
            });
        });

        it('should support renderError() without statsOptions', () => {
            const compiler = createCompiler(configClientBasic, configServerSyntaxError);
            const outputStream = createOutputStream();

            return compiler.run({
                report: { output: outputStream },
            })
            .then(() => {
                throw new Error('Should have failed');
            }, (err) => {
                const renderedErr = webpackIsomorphicCompiler.reporter.renderError(err);

                expect(createOutputStream.normalizeReporterOutput(renderedErr)).toMatchSnapshot();
            });
        });
    });
});
