"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fileLoadingPorts = __importStar(require("./file-loading-ports"));
var loggingPorts = __importStar(require("./util/logging-ports"));
var dependencies = __importStar(require("./util/dependencies"));
var reporter_1 = __importDefault(require("./reporter"));
var logging_ports_1 = require("./util/logging-ports");
var directory = process.cwd();
var Elm = require('./backend-elm');
function start(config, project) {
    var reporter = reporter_1.default.build(config.format);
    startAnalyser(config, project, function (_, report) {
        reporter.report(report);
        var fail = report.messages.length > 0 || report.unusedDependencies.length > 0;
        process.exit(fail ? 1 : 0);
    });
}
function fix(path, config, project) {
    var initialReport;
    startAnalyser(config, project, function onReport(app, report) {
        if (!initialReport) {
            initialReport = report;
        }
        else {
            var reportForFile = __assign({}, initialReport, { messages: initialReport.messages.filter(function (m) { return m.file == path; }) });
            var newReportForFile = __assign({}, report, { messages: report.messages.filter(function (m) { return m.file == path; }) });
            printReport("Fix Complete for " + path, reportForFile, newReportForFile);
            return;
        }
        app.ports.storeFile.subscribe(function () {
            logging_ports_1.printInPlace("Writing file: " + path);
            app.ports.onReset.send(true);
        });
        app.ports.onFixFileMessage.send(path);
    });
}
function fixAll(config, project) {
    var initialReport;
    startAnalyser(config, project, function onReport(app, report) {
        if (!initialReport) {
            initialReport = report;
        }
        else {
            printReport("Fix Complete", initialReport, report);
            return;
        }
        var files = new Set(report.messages.map(function (m) { return m.file; }));
        var filesLeftToSave = files.size;
        app.ports.storeFile.subscribe(function (fileStore) {
            logging_ports_1.printInPlace("Writing file " + fileStore.file);
            filesLeftToSave--;
            if (filesLeftToSave === 0) {
                app.ports.onReset.send(true);
            }
        });
        files.forEach(function (file) {
            logging_ports_1.printInPlace("Fixing file: " + file);
            app.ports.onFixFileMessage.send(file);
        });
    });
}
function printReport(title, initialReport, newReport) {
    console.log('\n');
    console.log("Elm Analyse - " + title);
    console.log('------------------------------');
    console.log("Messages Before: " + initialReport.messages.length);
    console.log("Messages After : " + newReport.messages.length);
    console.log("Issues Fixed   : " + (initialReport.messages.length - newReport.messages.length));
    console.log('------------------------------');
}
function startAnalyser(config, project, onReport) {
    if (project === void 0) { project = {}; }
    dependencies.getDependencies(function (registry) {
        var app = Elm.Elm.Analyser.init({
            flags: {
                server: false,
                registry: registry || [],
                project: project
            }
        });
        app.ports.sendReportValue.subscribe(function (report) {
            onReport(app, report);
        });
        loggingPorts.setup(app, config);
        fileLoadingPorts.setup(app, config, directory);
    });
}
exports.default = { start: start, fix: fix, fixAll: fixAll };
