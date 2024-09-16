const {
  CustomString,
  CustomList,
  CustomMap,
  CustomFunction,
  CustomBoolean,
  CustomNumber,
  DefaultType,
  ObjectValue,
  CustomNil
} = require('../../dist');

const exit = CustomFunction.createExternal('exit', async (vm, self, args) => {
  const message = args.get('message');
  if (message instanceof CustomString) {
    vm.handler.outputHandler.print(message);
  }
  vm.exit();
  return Promise.resolve(DefaultType.Void);
}).addArgument("message");

const print = CustomFunction.createExternal('print', (vm, self, args) => {
  vm.handler.outputHandler.print(args.get('value'));
  return Promise.resolve(DefaultType.Void);
}).addArgument('value');

const stringify = CustomFunction.createExternal('print', (vm, self, args) => {
  vm.handler.outputHandler.print(args.get('value').toString());
  return Promise.resolve(DefaultType.Void);
}).addArgument('value');

const valueOfTest = CustomFunction.createExternal('valueOfTest', (vm, self, args) => {
  return Promise.resolve(args.get('value'));
}).addArgument('value');

const typeofFunc = CustomFunction.createExternal('typeof', (vm, self, args) => {
  const value = args.get('value');
  return Promise.resolve(new CustomString(value.getCustomType()));
}).addArgument('value');

const returnString = CustomFunction.createExternal('returnString', (vm, self, args) =>
  Promise.resolve(new CustomString('string'))
);

const returnNil = CustomFunction.createExternal('returnNil', (vm, self, args) =>
  Promise.resolve(DefaultType.Void)
);

const mapToObject = CustomFunction.createExternal('mapToObject', (vm, self, args) => {
  const value = args.get('value');

  if (value instanceof CustomMap) {
    return Promise.resolve(value);
  }

  return Promise.resolve(DefaultType.Void);
}).addArgument('value');

const range = CustomFunction.createExternal(
  'range',
  (
    _vm,
    _self,
    args
  ) => {
    const from = args.get('from');
    const to = args.get('to');
    const step = args.get('step');

    if (!(to instanceof CustomNumber)) {
      throw new Error('range() "to" parameter not a number');
    }

    const start = from.toNumber();
    const end = to.toNumber();
    const inc = step?.toInt() || (end >= start ? 1 : -1);

    if (inc === 0) {
      throw new Error('range() error (step==0)');
    }

    const check = inc > 0 ? (i) => i <= end : (i) => i >= end;
    const result = [];

    for (let index = start; check(index); index += inc) {
      result.push(new CustomNumber(index));
    }

    return Promise.resolve(new CustomList(result));
  }
)
  .addArgument('from', DefaultType.Zero)
  .addArgument('to', DefaultType.Zero)
  .addArgument('step');

const sqrt = CustomFunction.createExternal(
  'sqrt',
  (
    _vm,
    _self,
    args
  ) => {
    const value = args.get('value');
    if (value instanceof CustomNil) return Promise.resolve(DefaultType.Void);
    return Promise.resolve(new CustomNumber(Math.sqrt(value.toNumber())));
  }
).addArgument('value', DefaultType.Zero);

const pop = CustomFunction.createExternalWithSelf(
  'pop',
  (vm, self, args) => {
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

const remove = CustomFunction.createExternalWithSelf(
  'remove',
  (
    _vm,
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

const values = CustomFunction.createExternalWithSelf(
  'values',
  (
    _vm,
    _self,
    args,
  ) => {
    const origin = args.get('self');

    if (origin instanceof CustomMap) {
      const values = Array.from(origin.value.values());
      return Promise.resolve(new CustomList(values));
    } else if (origin instanceof CustomList) {
      const values = Object.values(origin.value);
      return Promise.resolve(new CustomList(values));
    } else if (origin instanceof CustomString) {
      const values = Object.values(origin.value).map(
        (item) => new CustomString(item)
      );
      return Promise.resolve(new CustomList(values));
    }

    return Promise.resolve(DefaultType.Void);
  }
);

const len = CustomFunction.createExternalWithSelf('len', (vm, self, args) =>
  Promise.resolve(new CustomNumber(args.get('self').value.length))
);

const split = CustomFunction.createExternalWithSelf('split', (vm, self, args) => {
  const delimiter = args.get('delimiter');
  const values = args.get('self').value
    .split(delimiter.toString())
    .map((segment) => new CustomString(segment));

  return Promise.resolve(new CustomList(values));
}).addArgument('delimiter', new CustomString(','));

const push = CustomFunction.createExternalWithSelf('push', (vm, self, args) => {
  const value = args.get('value');
  const nextIndex = args.get('self').value.push(value);
  return Promise.resolve(new CustomNumber(nextIndex));
}).addArgument('value', new CustomString(','));

const hasIndex = CustomFunction.createExternalWithSelf('hasIndex', (vm, self, args) => {
  const value = args.get('value');
  const result = args.get('self').has(value);
  return Promise.resolve(new CustomBoolean(result));
}).addArgument('value');

exports.setupAPI = function () {
  const api = new ObjectValue();

  api.set(new CustomString('exit'), exit);
  api.set(new CustomString('print'), print);
  api.set(new CustomString('stringify'), stringify);
  api.set(new CustomString('valueOfTest'), valueOfTest);
  api.set(new CustomString('typeof'), typeofFunc);
  api.set(new CustomString('returnString'), returnString);
  api.set(new CustomString('returnNil'), returnNil);
  api.set(new CustomString('mapToObject'), mapToObject);
  api.set(new CustomString('pop'), pop);
  api.set(new CustomString('remove'), remove);
  api.set(new CustomString('range'), range);
  api.set(new CustomString('sqrt'), sqrt);

  CustomString.addIntrinsic(new CustomString('len'), len);
  CustomString.addIntrinsic(new CustomString('split'), split);

  CustomList.addIntrinsic(new CustomString('len'), len);
  CustomList.addIntrinsic(new CustomString('push'), push);
  CustomList.addIntrinsic(new CustomString('pop'), pop);

  CustomMap.addIntrinsic(new CustomString('hasIndex'), hasIndex);
  CustomMap.addIntrinsic(new CustomString('values'), values);
  CustomMap.addIntrinsic(new CustomString('pop'), pop);

  return api;
}