const {
  Interpreter,
  HandlerContainer
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
      interpreter.once('exit', () => {
        expect(getPrintMock()).toBeCalledTimes(0);
        done();
      });

      interpreter.run({
        customCode: `
          test = "foo"
          exit
          print("123")
          print("456")
          print("789")
          print(test)
        `
      });
    });

    test('should exit within arg resolve', function (done) {
      interpreter.once('exit', () => {
        expect(getPrintMock()).toBeCalledTimes(1);
        expect(getPrintMock()).toBeCalledWith(expect.objectContaining({
          value: 'bye'
        }));
        done();
      });

      interpreter.run({
        customCode: `
        f = function; exit("bye"); end function
        u = function(param); print "f"; end function
        u(f)
        `
      });
    });

    test('should exit within args resolve', function (done) {
      interpreter.once('exit', () => {
        expect(getPrintMock()).toBeCalledTimes(3);
        expect(getPrintMock()).toHaveBeenLastCalledWith(expect.objectContaining({
          value: 'bye'
        }));
        done();
      });

      interpreter.run({
        customCode: `
        a = function; print "a"; end function
        b = function; print "b"; end function
        c = function; print "c"; end function
        d = function; print "d"; end function
        f = function; exit("bye"); end function
        u = function(a, b, c, d, e, f); print "f"; end function
        u(a, b, f, c, d)
        `
      });
    });

    test('should exit within if statement', function (done) {
      interpreter.once('exit', () => {
        expect(getPrintMock()).toBeCalledTimes(1);
        expect(getPrintMock()).toBeCalledWith(expect.objectContaining({
          value: 'bye'
        }));
        done();
      });

      interpreter.run({
        customCode: `
        if not exit("bye") then
          print "hey"
        end if
        `
      });
    });

    test('should exit within if else statement', function (done) {
      interpreter.once('exit', () => {
        expect(getPrintMock()).toBeCalledTimes(1);
        expect(getPrintMock()).toBeCalledWith(expect.objectContaining({
          value: 'bye'
        }));
        done();
      });

      interpreter.run({
        customCode: `
        if false then
          print "not here"
        else if exit("bye") then
          print "not here"
        else
          print "hey"
        end if

        print "hey"
        `
      });
    });

    test('should contain correct stack', async function () {
      let stack = [];

      try {
        await interpreter.run({
          customCode: `
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
          `
        });
      } catch (err) {
        stack = err.stack;
      }

      expect(stack).toMatchSnapshot();
    });

    test('should throw since path cannot be resolved if context does not have intrinsics', async function () {
      await expect(interpreter.run({
        customCode: `
          test = {}
          test.item = null

          test.item.push(234)
        `
      })
      ).rejects.toEqual(new Error('Path "push" not found in "null" intrinsics.'));
      await expect(interpreter.run({
        customCode: `
          test = {}
          test.item = null

          test.item.push
        `
      })
      ).rejects.toEqual(new Error('Path "push" not found in "null" intrinsics.'));
      await expect(interpreter.run({
        customCode: `
          null.push(234)
        `
      })
      ).rejects.toEqual(new Error('Path "push" not found in "null" intrinsics.'));
      await expect(interpreter.run({
        customCode: `
          test = {}
          test.item = null
          foo = new test
          foo.bar = function
            super.item.push(123)
          end function

          foo.bar
        `
      })
      ).rejects.toEqual(new Error('Path "push" not found in "null" intrinsics.'));
      await expect(interpreter.run({
        customCode: `
          test = {}
          test.item = null
          foo = new test
          foo.bar = function
            super.item.push
          end function

          foo.bar
        `
      })
      ).rejects.toEqual(new Error('Path "push" not found in "null" intrinsics.'));
    });

    test('should throw since definition is not within reachable scope', async function () {
      await expect(interpreter.run({
        customCode: `
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
        `
      })
      ).rejects.toEqual(new Error('Path "foo" not found in scope.'));
    });

    test('should throw since anonymous function do not have an outer', async function () {
      await expect(interpreter.run({
        customCode: `
          someFunc = function(fn)
            fn
          end function

          main = function()
              a = function(x)
                someFunc function
                  print x
                end function
              end function
              
              b = function(x)
                foo = function
                  print x
                end function
                someFunc @foo
              end function
              
              a("wa")
              b("wa")
          end function

          main
        `
      })).rejects.toEqual(new Error('Path "x" not found in scope.'));
    });

    test('should throw since null cannot be iterated through', async function () {
      await expect(interpreter.run({
        customCode: `
          for x in null
            print x
          end for
        `
      })).rejects.toEqual(new Error('"null" does not have an iterator.'));
    });
  });
});
