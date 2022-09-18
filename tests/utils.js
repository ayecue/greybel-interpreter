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
        'print',
        CustomFunction.createExternal('print', (fnCtx, self, args) => {
            fnCtx.handler.outputHandler.print(args.get('value'));
        }).addArgument('value')
    );

    api.set(
        'valueOfTest',
        CustomFunction.createExternal('valueOfTest', (fnCtx, self, args) => {
            return args.get('value');
        }).addArgument('value')
    );

    api.set(
        'typeof',
        CustomFunction.createExternal('typeof', (fnCtx, self, args) => {
            const value = args.get('value');
            return new CustomString(value.getCustomType());
        }).addArgument('value')
    );

    api.set(
        'returnString',
        CustomFunction.createExternal(
            'returnString',
            (fnCtx, self, args) => new CustomString('string')
        )
    );

    api.set(
        'returnNil',
        CustomFunction.createExternal(
            'returnNil',
            (fnCtx, self, args) => Defaults.Void
        )
    );

    api.set(
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

    api.set('pop', pop);

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

    return api;
}

exports.preparePrintMock = () => printMock = jest.fn();
exports.getPrintMock = () => printMock;
exports.pseudoAPI = setupAPI();

exports.TestDebugger = class extends Debugger {
  debug() {}
}

exports.TestOutputHandler = class extends OutputHandler {
  print(message) {
    printMock(message);
  }
}