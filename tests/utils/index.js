const {
  Debugger,
  OutputHandler
} = require('../../dist');
const { setupAPI } = require('./api');
let printMock = jest.fn();

exports.preparePrintMock = () => (printMock = jest.fn());
exports.getPrintMock = () => printMock;
exports.pseudoAPI = setupAPI();

exports.TestDebugger = class extends Debugger {
  debug() { }
};

exports.TestOutputHandler = class extends OutputHandler {
  print(message) {
    printMock(message);
  }
};
