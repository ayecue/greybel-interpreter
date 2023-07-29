import { ASTForGenericStatement, ASTIdentifier } from 'greyscript-core';

import {
  ContextState,
  ContextType,
  LoopState,
  OperationContext
} from '../context';
import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CustomNumber } from '../types/number';
import { CustomString } from '../types/string';
import { CustomValueWithIntrinsics } from '../types/with-intrinsics';
import { Block } from './block';
import { CPSVisit, Operation, OperationBlock } from './operation';

export class For extends OperationBlock {
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
    this.block = new Block(this.item, stack);
    this.variable = this.item.variable as ASTIdentifier;
    this.iterator = await visit(this.item.iterator);
    return this;
  }

  async handle(ctx: OperationContext): Promise<CustomValue> {
    const forCtx = ctx.fork({
      type: ContextType.Loop,
      state: ContextState.Temporary
    });
    const identifier = this.variable.name;
    const iteratorValue = (await this.iterator.handle(
      ctx
    )) as CustomValueWithIntrinsics;

    if (typeof iteratorValue[Symbol.iterator] !== 'function') {
      return Promise.resolve(DefaultType.Void);
    }

    const loopState = new LoopState();

    forCtx.loopState = loopState;

    return new Promise((resolve, reject) => {
      const iterator = iteratorValue[Symbol.iterator]();
      const idxIdentifier = new CustomString(`__${identifier}_idx`);
      const varIdentifier = new CustomString(identifier);
      let iteratorResult = iterator.next();

      const iteration = async (): Promise<void> => {
        try {
          if (iteratorResult.done) {
            resolve(DefaultType.Void);
            return;
          }

          const current = iteratorResult.value as CustomValue;

          loopState.isContinue = false;

          forCtx.set(idxIdentifier, new CustomNumber(iterator.index - 1));
          forCtx.set(varIdentifier, current);
          await this.block.handle(forCtx);

          if (
            loopState.isBreak ||
            forCtx.functionState.isReturn ||
            ctx.isExit()
          ) {
            resolve(DefaultType.Void);
            return;
          }

          const idxValue = forCtx.get(idxIdentifier).toNumber();
          iterator.index += idxValue - (iterator.index - 1);
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
