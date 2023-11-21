const {
  Debugger,
  CustomString,
  CustomList,
  CustomMap,
  CustomFunction,
  CustomBoolean,
  CustomNumber,
  DefaultType,
  OutputHandler,
  ObjectValue,
  CustomNil
} = require('../dist');
let printMock = console.log//jest.fn();

function setupAPI() {
  const api = new ObjectValue();

  api.set(
    new CustomString('exit'),
    CustomFunction.createExternal('exit', async (vm, self, args) => {
      const message = args.get('message');
      if (message instanceof CustomString) {
        vm.handler.outputHandler.print(message);
      }
      vm.exit();
      return Promise.resolve(DefaultType.Void);
    }).addArgument("message")
  );

  api.set(
    new CustomString('print'),
    CustomFunction.createExternal('print', (vm, self, args) => {
      vm.handler.outputHandler.print(args.get('value'));
      return Promise.resolve(DefaultType.Void);
    }).addArgument('value')
  );

  api.set(
    new CustomString('stringify'),
    CustomFunction.createExternal('print', (vm, self, args) => {
      vm.handler.outputHandler.print(args.get('value').toString());
      return Promise.resolve(DefaultType.Void);
    }).addArgument('value')
  );

  api.set(
    new CustomString('valueOfTest'),
    CustomFunction.createExternal('valueOfTest', (vm, self, args) => {
      return Promise.resolve(args.get('value'));
    }).addArgument('value')
  );

  api.set(
    new CustomString('typeof'),
    CustomFunction.createExternal('typeof', (vm, self, args) => {
      const value = args.get('value');
      return Promise.resolve(new CustomString(value.getCustomType()));
    }).addArgument('value')
  );

  api.set(
    new CustomString('returnString'),
    CustomFunction.createExternal('returnString', (vm, self, args) =>
      Promise.resolve(new CustomString('string'))
    )
  );

  api.set(
    new CustomString('returnNil'),
    CustomFunction.createExternal('returnNil', (vm, self, args) =>
      Promise.resolve(DefaultType.Void)
    )
  );
  
  api.set(
    new CustomString('mapToObject'),
    CustomFunction.createExternal('mapToObject', (vm, self, args) => {
      const value = args.get('value');

      if (value instanceof CustomMap) {
        return Promise.resolve(value);
      }

      return Promise.resolve(DefaultType.Void);
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

      return Promise.resolve(DefaultType.Void);
    }
  );

  api.set(new CustomString('pop'), pop);

  const remove = CustomFunction.createExternalWithSelf(
    'remove',
    (
      _ctx,
      _self,
      args
    ) => {
      const origin = args.get('self');
      const keyValue = args.get('keyValue');

      if (origin instanceof CustomNil || keyValue instanceof CustomNil) {
        throw new Error("argument to 'remove' must not be null");
      }

      if (origin instanceof CustomMap) {
        if (origin.has(keyValue)) {
          origin.value.delete(keyValue);
          return Promise.resolve(DefaultType.True);
        }
        return Promise.resolve(DefaultType.False);
      } else if (origin instanceof CustomList) {
        const listIndex = itemAtIndex(origin.value, keyValue.toInt());
        if (Object.prototype.hasOwnProperty.call(origin.value, listIndex)) {
          origin.value.splice(listIndex, 1);
        }
        return Promise.resolve(DefaultType.Void);
      } else if (origin instanceof CustomString) {
        const replaced = new CustomString(
          origin.value.replace(keyValue.toString(), '')
        );
        return Promise.resolve(replaced);
      }

      throw new Error("Type Error: 'remove' requires map, list, or string");
    }
  ).addArgument('keyValue');

  api.set(new CustomString('remove'), remove);

  CustomString.addIntrinsic(
    new CustomString('len'),
    CustomFunction.createExternalWithSelf('len', (vm, self, args) =>
      Promise.resolve(new CustomNumber(args.get('self').value.length))
    )
  );

  CustomString.addIntrinsic(
    new CustomString('split'),
    CustomFunction.createExternalWithSelf('split', (vm, self, args) => {
      const delimiter = args.get('delimiter');
      const values = args.get('self').value
        .split(delimiter.toString())
        .map((segment) => new CustomString(segment));

      return Promise.resolve(new CustomList(values));
    }).addArgument('delimiter', new CustomString(','))
  );

  CustomList.addIntrinsic(
    new CustomString('len'),
    CustomFunction.createExternalWithSelf('len', (vm, self, args) =>
      Promise.resolve(new CustomNumber(args.get('self').value.length))
    )
  );

  CustomList.addIntrinsic(
    new CustomString('push'),
    CustomFunction.createExternalWithSelf('push', (vm, self, args) => {
      const value = args.get('value');
      const nextIndex = args.get('self').value.push(value);
      return Promise.resolve(new CustomNumber(nextIndex));
    }).addArgument('value', new CustomString(','))
  );

  CustomList.addIntrinsic(new CustomString('pop'), pop);

  CustomMap.addIntrinsic(
    new CustomString('hasIndex'),
    CustomFunction.createExternalWithSelf('hasIndex', (vm, self, args) => {
      const value = args.get('value');
      const result = args.get('self').has(value);
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
