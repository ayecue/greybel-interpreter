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
          }).addArgument("message")
        );

        try {
          await interpreter.run();
          success = true;
        } catch (e) {
          console.log(`${filepath} failed with: `, e);
        }

        expect(success).toEqual(true);
        for (const call of getPrintMock().mock.calls) {
          expect(call[0]).toMatchSnapshot();
        }
      });
    });
  });

  describe('specific cases', () => {
    let interpreter;

    beforeEach(() => {
      interpreter = new Interpreter({
        api: pseudoAPI,
        handler: new HandlerContainer({
          outputHandler: new TestOutputHandler()
        }),
        debugger: new TestDebugger()
      });
    });

    test('should exit', function (done) {
      pseudoAPI.set(
        new CustomString('exit'),
        CustomFunction.createExternal('exit', () => {
          interpreter.exit();
          return Promise.resolve(DefaultType.Void);
        }).addArgument("message")
      );

      interpreter.once('exit', () => {
        expect(getPrintMock().mock.calls.length).toEqual(0);
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
        exit
        print("123")
        print("456")
        print("789")
      `);
    });

    test('should contain correct stack', async function () {
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

    test('should throw since definition is not within reachable scope', async function () {
      await expect(interpreter.run(`
          a = function
            foo = {"bar": 123}
            b = function
              c = function
                print foo.bar
              end function
              c
            end function
            b
          end function
          a
        `)
      ).rejects.toEqual(new Error('Unknown path foo.'));
    });

    test('should throw since property on self cannot be resolved', async function () {
      await expect(interpreter.run(`
          Foo = {"a":123}
          Foo.a = function
            locals.self = self
            b = function
              print self.a
            end function
            b
          end function
          Foo.a
        `)
      ).rejects.toEqual(new Error('Unknown path a.'));
    });
  });
});
