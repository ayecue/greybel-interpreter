import { RuntimeKeyword } from '../bytecode-generator/keywords';
import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CustomFunction } from '../types/function';
import { CustomMap } from '../types/map';

export function call(
  frame: OperationContext,
  fn: CustomFunction,
  args: CustomValue[]
) {
  const argsCount = args.length;

  for (let index = 0; index < argsCount; index++) {
    const argument = args.shift();
    const paramNum = argsCount - 1 - index;

    if (paramNum >= fn.arguments.length) {
      throw new Error('Too many arguments.');
    }

    const param = fn.arguments[paramNum].name;

    if (param.toString() === RuntimeKeyword.Self) {
      frame.self = argument;
      frame.super =
        argument instanceof CustomMap
          ? argument.getIsa() ?? new CustomMap()
          : null;
    } else {
      frame.set(param, argument);
    }
  }

  for (let paramNum = argsCount; paramNum < fn.arguments.length; paramNum++) {
    frame.set(fn.arguments[paramNum].name, fn.arguments[paramNum].defaultValue);
  }

  frame.injectContext();
}

export function callWithContext(
  frame: OperationContext,
  fn: CustomFunction,
  args: CustomValue[]
) {
  const argsCount = args.length;
  const selfParam =
    fn.arguments.length > 0 &&
    fn.arguments[0].name.toString() === RuntimeKeyword.Self
      ? 1
      : 0;

  for (let index = 0; index < argsCount; index++) {
    const argument = args.shift();
    const paramNum = argsCount - 1 - index + selfParam;

    if (paramNum >= fn.arguments.length) {
      throw new Error('Too many arguments.');
    }

    const param = fn.arguments[paramNum].name;
    if (param.toString() !== RuntimeKeyword.Self) frame.set(param, argument);
  }

  for (
    let paramNum = argsCount + selfParam;
    paramNum < fn.arguments.length;
    paramNum++
  ) {
    frame.set(fn.arguments[paramNum].name, fn.arguments[paramNum].defaultValue);
  }

  frame.injectContext();
}
