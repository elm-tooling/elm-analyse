import * as fileLoadingPorts from './file-loading-ports';
import * as loggingPorts from './util/logging-ports';
import { Registry } from './util/dependencies';
import * as dependencies from './util/dependencies';
import { ElmApp, Config, Report, FileStore } from './domain';
import Reporter from './reporter';

const directory = process.cwd();
const Elm = require('./backend-elm');

function start(config: Config, project: {}) {
    const reporter = Reporter.build(config.format);

    startAnalyser(config, project, function(_, report: Report) {
        reporter.report(report);
        const fail = report.messages.length > 0 || report.unusedDependencies.length > 0;
        process.exit(fail ? 1 : 0);
    });
}

function fix(path: string, config: Config, project: {}) {
    startAnalyser(config, project, function onReport(app: ElmApp, _) {
        app.ports.storeFile.subscribe((fileStore: FileStore) => {
            console.log(`Saving file....`);
        });
        app.ports.onFixFileMessage.send(path);
    });
}

function fixAll(config: Config, project: {}) {
    let initialReport: Report;
    startAnalyser(config, project, function onReport(app: ElmApp, report: Report) {
        if (!initialReport) {
            initialReport = report;
        } else {
            console.log('\n');
            console.log('Elm Analyse - Fix All Complete');
            console.log('------------------------------');
            console.log(`Messages Before: ${initialReport.messages.length}`);
            console.log(`Messages After : ${report.messages.length}`);
            console.log(`Issues Fixed   : ${initialReport.messages.length - report.messages.length}`);
            console.log('------------------------------');
            return;
        }

        const files = new Set(report.messages.map(m => m.file));
        let filesLeftToSave = files.size;
        app.ports.storeFile.subscribe((fileStore: FileStore) => {
            console.log(`Writing file ${fileStore.file}`);
            filesLeftToSave--;
            if (filesLeftToSave === 0) {
                app.ports.onReset.send(true);
            }
        });
        files.forEach((file: string) => {
            console.log(`Fixing file: ${file}`);
            app.ports.onFixFileMessage.send(file);
        });
    });
}

function startAnalyser(config: Config, project = {}, onReport: (app: ElmApp, report: Report) => any) {
    dependencies.getDependencies(function(registry: Registry) {
        const app: ElmApp = Elm.Elm.Analyser.init({
            flags: {
                server: false,
                registry: registry || [],
                project: project
            }
        });

        app.ports.sendReportValue.subscribe(function(report) {
            onReport(app, report);
        });

        loggingPorts.setup(app, config);
        fileLoadingPorts.setup(app, config, directory);
    });
}

export default { start, fix, fixAll };
