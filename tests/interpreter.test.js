const {
  Interpreter,
  Debugger,
  CustomString,
  CustomList,
  CustomMap,
  CustomFunction,
  CustomBoolean,
  CustomNumber,
  Defaults,
  CustomValue
} = require('../dist');
const fs = require('fs');
const path = require('path');
const testFolder = path.resolve(__dirname, 'scripts');

let printMock;
const pseudoAPI = new Map();

pseudoAPI.set(
  'print',
  CustomFunction.createExternal('print', (fnCtx, self, args) => {
    // console.log(args);
    printMock(args.get('value'));
  }).addArgument('value')
);

pseudoAPI.set(
  'valueOfTest',
  CustomFunction.createExternal('valueOfTest', (fnCtx, self, args) => {
    return args.get('value');
  }).addArgument('value')
);

pseudoAPI.set(
  'typeof',
  CustomFunction.createExternal('typeof', (fnCtx, self, args) => {
    const value = args.get('value');
    return new CustomString(value.getCustomType());
  }).addArgument('value')
);

pseudoAPI.set(
  'returnString',
  CustomFunction.createExternal(
    'returnString',
    (fnCtx, self, args) => new CustomString('string')
  )
);

pseudoAPI.set(
  'returnNil',
  CustomFunction.createExternal(
    'returnNil',
    (fnCtx, self, args) => Defaults.Void
  )
);

pseudoAPI.set(
  'mapToObject',
  CustomFunction.createExternal('mapToObject', (fnCtx, self, args) => {
    const value = args.get('value');

    if (value instanceof CustomMap) {
      return value;
    }

    return Defaults.Void;
  }).addArgument('value')
);

const pop = CustomFunction.createExternalWithSelf(
  'pop',
  (fnCtx, self, args) => {
    const origin = args.get('self');

    if (origin instanceof CustomMap) {
      const keys = Array.from(origin.value.keys());
      const item = origin.get(keys[0]);
      origin.value.delete(keys[0]);
      return item;
    } else if (origin instanceof CustomList) {
      return origin.value.pop();
    }

    return Defaults.Void;
  }
);

pseudoAPI.set('pop', pop);

CustomString.getIntrinsics().add(
  'len',
  CustomFunction.createExternalWithSelf(
    'len',
    (fnCtx, self, args) => new CustomNumber(self.value.length)
  )
);

CustomString.getIntrinsics().add(
  'split',
  CustomFunction.createExternalWithSelf('split', (fnCtx, self, args) => {
    const delimiter = args.get('delimiter');
    const values = self.value
      .split(delimiter.toString())
      .map((segment) => new CustomString(segment));

    return new CustomList(values);
  }).addArgument('delimiter', new CustomString(','))
);

CustomList.getIntrinsics().add(
  'len',
  CustomFunction.createExternalWithSelf(
    'len',
    (fnCtx, self, args) => new CustomNumber(self.value.length)
  )
);

CustomList.getIntrinsics().add(
  'push',
  CustomFunction.createExternalWithSelf('push', (fnCtx, self, args) => {
    const value = args.get('value');
    const nextIndex = self.value.push(value);

    return new CustomNumber(nextIndex);
  }).addArgument('value', new CustomString(','))
);

CustomList.getIntrinsics().add('pop', pop);

CustomMap.getIntrinsics().add(
  'hasIndex',
  CustomFunction.createExternalWithSelf('hasIndex', (fnCtx, self, args) => {
    const value = args.get('value');
    const result = self.has(value);
    return new CustomBoolean(result);
  }).addArgument('value')
);

CustomMap.getIntrinsics().add('pop', pop);

class TestDebugger extends Debugger {
  debug() {}
}

describe('interpreter', function () {
  beforeEach(function () {
    printMock = jest.fn();
  });

  describe('default scripts', function () {
    fs.readdirSync(testFolder).forEach((file) => {
      const filepath = path.resolve(testFolder, file);

      test(path.basename(filepath), async () => {
        const interpreter = new Interpreter({
          target: filepath,
          api: pseudoAPI,
          debugger: new TestDebugger()
        });
        let success = false;

        pseudoAPI.set(
          'exit',
          CustomFunction.createExternal('exit', (fnCtx, self, args) => {
            interpreter.exit();
          })
        );

        try {
          await interpreter.run();
          success = true;
        } catch (e) {
          const opc = interpreter.apiContext.getLastActive() || interpreter.globalContext;
          console.log(`Line: ${opc.stackItem?.start.line}`, `${filepath} failed with: `, e);
        }

        expect(success).toEqual(true);
        for (const call of printMock.mock.calls) {
          expect(call[0]).toMatchSnapshot();
        }
      });
    });
  });

  test('should exit', function (done) {
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

        interpreter.run(`
					print("123")
					print("456")
					print("789")
					print(test)
				`);
      }, 1000);
    });

    interpreter.run(`
			test = "foo"
			print("123")
			print("456")
			print("789")
		`);
  });
});
