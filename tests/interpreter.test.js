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
  CustomFunction.createAnonymous((fnCtx, self, args) => {
    //console.log(args);
    printMock(args.get('value'));
  }).addArgument('value')
);

pseudoAPI.set(
  'valueOfTest',
  CustomFunction.createAnonymous((fnCtx, self, args) => {
    return args.get('value');
  }).addArgument('value')
);

pseudoAPI.set(
  'typeof',
  CustomFunction.createAnonymous((fnCtx, self, args) => {
    const value = args.get('value');
    return new CustomString(value.getCustomType());
  }).addArgument('value')
);

pseudoAPI.set(
  'returnString',
  CustomFunction.createAnonymous(
    (fnCtx, self, args) => new CustomString('string')
  )
);

pseudoAPI.set(
  'returnNil',
  CustomFunction.createAnonymous((fnCtx, self, args) => Defaults.Void)
);

pseudoAPI.set(
  'mapToObject',
  CustomFunction.createAnonymous((fnCtx, self, args) => {
    const value = args.get('value');

    if (value instanceof CustomMap) {
      return value;
    }

    return Defaults.Void;
  }).addArgument('value')
);

const pop = (origin) => {
  if (origin instanceof CustomMap) {
    const keys = Array.from(origin.value.keys());
    const item = origin.get(keys[0]);
    origin.value.delete(keys[0]);
    return item;
  } else if (origin instanceof CustomList) {
    return origin.value.pop(); 
  }

  return Defaults.Void;
};

pseudoAPI.set(
  'pop',
  CustomFunction.createAnonymous((fnCtx, self, args) => {
    const value = args.get('value');
    return pop(value);
  }).addArgument('value')
);

CustomString.getIntrinsics().add(
  'len',
  CustomFunction.createAnonymous((fnCtx, self, args) => new CustomNumber(self.value.length))
);

CustomString.getIntrinsics().add(
  'split',
  CustomFunction.createAnonymous((fnCtx, self, args) => {
    const delimiter = args.get('delimiter');
    const values = self.value
      .split(delimiter.toString())
      .map((segment) => new CustomString(segment));

    return new CustomList(values);
  }).addArgument('delimiter', new CustomString(','))
);

CustomList.getIntrinsics().add(
  'len',
  CustomFunction.createAnonymous((fnCtx, self, args) => new CustomNumber(self.value.length))
);

CustomList.getIntrinsics().add(
  'push',
  CustomFunction.createAnonymous((fnCtx, self, args) => {
    const value = args.get('value');
    const nextIndex = self.value.push(value);

    return new CustomNumber(nextIndex);
  }).addArgument('value', new CustomString(','))
);

CustomList.getIntrinsics().add(
  'pop',
  CustomFunction.createAnonymous((fnCtx, self, args) => pop(self))
);

CustomMap.getIntrinsics().add(
  'hasIndex',
  CustomFunction.createAnonymous((fnCtx, self, args) => {
    const value = args.get('value');
    const result = self.value.has(value.toString());
    return new CustomBoolean(result);
  }).addArgument('value')
);

CustomMap.getIntrinsics().add(
  'pop',
  CustomFunction.createAnonymous((fnCtx, self, args) => pop(self))
);

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
          CustomFunction.createAnonymous((fnCtx, self, args) => {
            interpreter.exit();
          })
        );

        try {
          await interpreter.run();
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
