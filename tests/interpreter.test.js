const {
	Interpreter,
	Debugger,
	CustomString,
	CustomList,
	CustomMap
} = require('../dist');
const fs = require('fs');
const path = require('path');
const testFolder = path.resolve(__dirname, 'scripts');

let printMock;
const pseudoAPI = new Map();

pseudoAPI.set('print', (customValue) => {
	printMock(customValue);
});

pseudoAPI.set('valueOfTest', (customValue) => {
	return customValue.valueOf();
});

pseudoAPI.set('mapToObject', (customValue) => {
	if (customValue instanceof CustomMap) {
		const result = {};

		customValue.value.forEach((v, k) => {
			result[k] = v;
		});

		return result;
	}
	return null;
});

CustomString.intrinsics.set('len', function(list) {
	return list.value.length;
});

CustomList.intrinsics.set('push', function(list, value) {
	return list.value.push(value);
});

class TestDebugger extends Debugger {
	debug() {}
}

describe('interpreter', function() {
	beforeEach(function() {
		printMock = jest.fn();
	});

	describe('default scripts', function() {
		fs
			.readdirSync(testFolder)
			.forEach(file => {
				const filepath = path.resolve(testFolder, file);

				test(path.basename(filepath), async () => {
					const interpreter = new Interpreter({
						target: filepath,
						api: pseudoAPI,
						debugger: new TestDebugger()
					});
					let success = false;

					try {
						await interpreter.digest();
						success = true;
					} catch (e) {
						console.log(`${filepath} failed with: `, e);
					}

					expect(success).toEqual(true);
					for (const call of printMock.mock.calls) {
						expect(call[0]).toMatchSnapshot();
					}
				});
			});
	});
});