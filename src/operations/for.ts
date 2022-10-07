import { ASTForGenericStatement, ASTIdentifier } from 'greyscript-core';

import context, { ContextState, ContextType, LoopState } from '../context';
import CustomValue from '../types/base';
import Defaults from '../types/default';
import CustomNumber from '../types/number';
import CustomString from '../types/string';
import { CustomValueWithIntrinsics } from '../types/with-intrinsics';
import Block from './block';
import Operation, { CPSVisit } from './operation';

export default class For extends Operation {
  readonly item: ASTForGenericStatement;
  block: Block;
  variable: ASTIdentifier;
  iterator: Operation;

  constructor(item: ASTForGenericStatement, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    const stack = await Promise.all(
      this.item.body.map((child) => visit(child))
    );
    this.block = new Block(stack);
    this.variable = this.item.variable as ASTIdentifier;
    this.iterator = await visit(this.item.iterator);
    return this;
  }

  async handle(ctx: context): Promise<CustomValue> {
    const forCtx = ctx.fork({
      type: ContextType.Loop,
      state: ContextState.Temporary
    });
    const identifier = this.variable.name;
    const iteratorValue = (await this.iterator.handle(
      ctx
    )) as CustomValueWithIntrinsics;

    if (typeof iteratorValue[Symbol.iterator] !== 'function') {
      return Promise.resolve(Defaults.Void);
    }

    const loopState = new LoopState();
    let index = 0;

    forCtx.loopState = loopState;

    return new Promise((resolve, reject) => {
      const iterator = iteratorValue[Symbol.iterator]();
      const idxIdentifier = new CustomString(`__${identifier}_idx`);
      const varIdentifier = new CustomString(identifier);
      let iteratorResult = iterator.next();

      const iteration = async (): Promise<void> => {
        try {
          if (iteratorResult.done) {
            resolve(Defaults.Void);
            return;
          }

          const current = iteratorResult.value as CustomValue;

          loopState.isContinue = false;

          forCtx.set(idxIdentifier, new CustomNumber(index++));
          forCtx.set(varIdentifier, current);
          await this.block.handle(forCtx);

          if (loopState.isBreak || ctx.isExit()) {
            resolve(Defaults.Void);
            return;
          }

          iteratorResult = iterator.next();
          process.nextTick(iteration);
        } catch (err: any) {
          reject(err);
        }
      };

      iteration();
    });
  }
}
