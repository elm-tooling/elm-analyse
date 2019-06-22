"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var readline = __importStar(require("readline"));
function setup(app, config) {
    if (config.format === 'human') {
        app.ports.log.subscribe(function (data) {
            if (data.level === 'INFO') {
                printInPlace(data.level + ':' + data.message);
            }
            else {
                console.log(data.level, data.message);
            }
        });
    }
}
exports.setup = setup;
function printInPlace(str) {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(str);
}
exports.printInPlace = printInPlace;
