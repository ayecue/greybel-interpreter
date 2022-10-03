const {
  Debugger,
  CustomString,
  CustomList,
  CustomMap,
  CustomFunction,
  CustomBoolean,
  CustomNumber,
  Defaults,
  OutputHandler
} = require('../dist');
let printMock = jest.fn();

function setupAPI() {
  const api = new Map();

  api.set(
    new CustomString('print'),
    CustomFunction.createExternal('print', (fnCtx, self, args) => {
      fnCtx.handler.outputHandler.print(args.get('value'));
      return Promise.resolve(Defaults.Void);
    }).addArgument('value')
  );

  api.set(
    new CustomString('stringify'),
    CustomFunction.createExternal('print', (fnCtx, self, args) => {
      fnCtx.handler.outputHandler.print(args.get('value').toString());
      return Promise.resolve(Defaults.Void);
    }).addArgument('value')
  );

  api.set(
    new CustomString('valueOfTest'),
    CustomFunction.createExternal('valueOfTest', (fnCtx, self, args) => {
      return Promise.resolve(args.get('value'));
    }).addArgument('value')
  );

  api.set(
    new CustomString('typeof'),
    CustomFunction.createExternal('typeof', (fnCtx, self, args) => {
      const value = args.get('value');
      return Promise.resolve(new CustomString(value.getCustomType()));
    }).addArgument('value')
  );

  api.set(
    new CustomString('returnString'),
    CustomFunction.createExternal('returnString', (fnCtx, self, args) =>
      Promise.resolve(new CustomString('string'))
    )
  );

  api.set(
    new CustomString('returnNil'),
    CustomFunction.createExternal('returnNil', (fnCtx, self, args) =>
      Promise.resolve(Defaults.Void)
    )
  );

  api.set(
    new CustomString('mapToObject'),
    CustomFunction.createExternal('mapToObject', (fnCtx, self, args) => {
      const value = args.get('value');

      if (value instanceof CustomMap) {
        return Promise.resolve(value);
      }

      return Promise.resolve(Defaults.Void);
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
        return Promise.resolve(item);
      } else if (origin instanceof CustomList) {
        return Promise.resolve(origin.value.pop());
      }

      return Promise.resolve(Defaults.Void);
    }
  );

  api.set(new CustomString('pop'), pop);

  CustomString.addIntrinsic(
    new CustomString('len'),
    CustomFunction.createExternalWithSelf('len', (fnCtx, self, args) =>
      Promise.resolve(new CustomNumber(self.value.length))
    )
  );

  CustomString.addIntrinsic(
    new CustomString('split'),
    CustomFunction.createExternalWithSelf('split', (fnCtx, self, args) => {
      const delimiter = args.get('delimiter');
      const values = self.value
        .split(delimiter.toString())
        .map((segment) => new CustomString(segment));

      return Promise.resolve(new CustomList(values));
    }).addArgument('delimiter', new CustomString(','))
  );

  CustomList.addIntrinsic(
    new CustomString('len'),
    CustomFunction.createExternalWithSelf('len', (fnCtx, self, args) =>
      Promise.resolve(new CustomNumber(self.value.length))
    )
  );

  CustomList.addIntrinsic(
    new CustomString('push'),
    CustomFunction.createExternalWithSelf('push', (fnCtx, self, args) => {
      const value = args.get('value');
      const nextIndex = self.value.push(value);

      return Promise.resolve(new CustomNumber(nextIndex));
    }).addArgument('value', new CustomString(','))
  );

  CustomList.addIntrinsic(new CustomString('pop'), pop);

  CustomMap.addIntrinsic(
    new CustomString('hasIndex'),
    CustomFunction.createExternalWithSelf('hasIndex', (fnCtx, self, args) => {
      const value = args.get('value');
      const result = self.has(value);
      return Promise.resolve(new CustomBoolean(result));
    }).addArgument('value')
  );

  CustomMap.addIntrinsic(new CustomString('pop'), pop);

  return api;
}

exports.preparePrintMock = () => (printMock = jest.fn());
exports.getPrintMock = () => printMock;
exports.pseudoAPI = setupAPI();

exports.TestDebugger = class extends Debugger {
  debug() {}
};

exports.TestOutputHandler = class extends OutputHandler {
  print(message) {
    printMock(message);
  }
};
