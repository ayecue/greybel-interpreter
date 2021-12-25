const { Interpreter, Debugger } = require('../dist');
const fs = require('fs');
const path = require('path');
const testFolder = path.resolve(__dirname, 'scripts');

let printMock;
const pseudoAPI = {
	print: function(customValue) {
		printMock(customValue.valueOf());
	}
};

class TestDebugger extends Debugger {
	debug() {}
}

describe('interpreter', function() {
	beforeEach(function() {
		printMock = jest.fn();
	});

	test('simple object script', async function() {
		const filepath = path.resolve(testFolder, 'test.src');
		const interpreter = new Interpreter({
			target: filepath,
			api: pseudoAPI,
			debugger: new TestDebugger()
		});

		try {
			await interpreter.digest();
			success = true;
		} catch (e) {
			console.log(`${filepath} failed with: `, e);
			success = false;
		}

		expect(success).toEqual(true);
		expect(printMock).toBeCalledWith(123);
	});
});