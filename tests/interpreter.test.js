const {
  Interpreter,
  CustomFunction,
  HandlerContainer,
  CustomString,
  DefaultType,
  ObjectValue
} = require('../dist');
const fs = require('fs');
const path = require('path');
const testFolder = path.resolve(__dirname, 'scripts');
const {
  pseudoAPI,
  TestDebugger,
  TestOutputHandler,
  preparePrintMock,
  getPrintMock
} = require('./utils')

describe('interpreter', function () {
  beforeEach(function () {
    preparePrintMock();
  });

  describe('default scripts', function () {
    fs.readdirSync(testFolder).forEach((file) => {
      const filepath = path.resolve(testFolder, file);

      test(path.basename(filepath), async () => {
        const interpreter = new Interpreter({
          target: filepath,
          api: pseudoAPI,
          handler: new HandlerContainer({
            outputHandler: new TestOutputHandler()
          }),
          debugger: new TestDebugger(),
          environmentVariables: new Map([
            ["test", "123"]
          ])
        });
        let success = false;

        pseudoAPI.set(
          new CustomString('exit'),
          CustomFunction.createExternal('exit', (fnCtx, self, args) => {
            interpreter.exit();
            return Promise.resolve(DefaultType.Void);
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
        for (const call of getPrintMock().mock.calls) {
          expect(call[0]).toMatchSnapshot();
        }
      });
    });
  });

  test('should exit', function (done) {
    const interpreter = new Interpreter({
      api: pseudoAPI,
      handler: new HandlerContainer({
        outputHandler: new TestOutputHandler()
      }),
      debugger: new TestDebugger()
    });

    interpreter.once('start', () => {
      interpreter.exit();
    });

    interpreter.once('exit', () => {
      expect(getPrintMock().mock.calls.length).toBeLessThan(3);
      preparePrintMock();

      setTimeout(() => {
        interpreter.once('exit', () => {
          for (const call of getPrintMock().mock.calls) {
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

  test('should contain correct stack', async function () {
    const interpreter = new Interpreter({
      api: pseudoAPI,
      handler: new HandlerContainer({
        outputHandler: new TestOutputHandler()
      }),
      debugger: new TestDebugger()
    });

    let stack = [];

    try {
      await interpreter.run(`
        foo = function
          unknown.test = "wrong"
        end function

        bar = function
          a = 1
          b = 2
          foo
        end function

        while (bar)

        end while
      `);
    } catch (err) {
      stack = err.stack;
    }

    expect(stack).toMatchSnapshot();
  });
});
