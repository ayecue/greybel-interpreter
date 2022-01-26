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

pseudoAPI.set('typeof', (customValue) => {
	return customValue.getType();
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

pseudoAPI.set('pop', (customValue) => {
	if (customValue instanceof CustomMap) {
		const keys = Array.from(customValue.value.keys());
		const item = customValue.value.get(keys[0]);
		customValue.value.delete(keys[0]);
		return item;
	} else if (customValue instanceof CustomList) {
		return customValue.value.pop();
	}

	return null;
});

CustomString.intrinsics.set('len', function(str) {
	return str.value.length;
});

CustomString.intrinsics.set('split', function(str, delimiter) {
	return str.value.split(delimiter?.toString());
});

CustomList.intrinsics.set('len', function(list) {
	return list.value.length;
});

CustomList.intrinsics.set('push', function(list, value) {
	return list.value.push(value);
});

CustomList.intrinsics.set('pop', pseudoAPI.get('pop'));

CustomMap.intrinsics.set('hasIndex', function(map, value) {
	return map.value.has(value.toString());
});

CustomMap.intrinsics.set('pop', pseudoAPI.get('pop'));

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

					pseudoAPI.set('exit', () => {
						interpreter.exit();
					});

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

	test('should exit', function(done) {
		const interpreter = new Interpreter({
			api: pseudoAPI,
			debugger: new TestDebugger()
		});

		interpreter.once('start', () => {
			interpreter.exit();
		});

		interpreter.once('exit', () => {
			expect(printMock.mock.calls.length).toBeLessThan(3);
			printMock = jest.fn();

			setTimeout(() => {
				interpreter.once('exit', () => {
					for (const call of printMock.mock.calls) {
						expect(call[0]).toMatchSnapshot();
					}

					done();
				});

				interpreter.digest(`
					print("123")
					print("456")
					print("789")
					print(test)
				`);
			}, 1000);
		});

		interpreter.digest(`
			test = "foo"
			print("123")
			print("456")
			print("789")
		`);
	});
});