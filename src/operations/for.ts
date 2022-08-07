import { ASTForGenericStatement } from 'greyscript-core';

import context, { ContextState, ContextType, LoopState } from '../context';
import Defaults from '../types/default';
import { CustomValue, CustomValueWithIntrinsics } from '../types/generics';
import Block from './block';
import Operation, { CPSVisit } from './operation';
import Resolve from './resolve';

export default class For extends Operation {
  readonly item: ASTForGenericStatement;
  block: Block;
  variable: Resolve;
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
    this.variable = new Resolve(this.item.variable);
    await this.variable.build(visit);
    this.iterator = await visit(this.item.iterator);
    return this;
  }

  async handle(ctx: context): Promise<CustomValue> {
    const forCtx = ctx.fork({
      type: ContextType.Loop,
      state: ContextState.Temporary
    });
    const resolveResult = await this.variable.getResult(ctx);
    const iteratorValue = (await this.iterator.handle(
      ctx
    )) as CustomValueWithIntrinsics;
    const loopState = new LoopState();

    forCtx.loopState = loopState;

    return new Promise((resolve, _reject) => {
      const iterator = iteratorValue[Symbol.iterator]();
      let iteratorResult = iterator.next();

      const iteration = async (): Promise<void> => {
        if (iteratorResult.done) {
          resolve(Defaults.Void);
          return;
        }

        const current = iteratorResult.value as CustomValue;

        loopState.isContinue = false;

        forCtx.set(resolveResult.path, current);
        await this.block.handle(forCtx);

        if (loopState.isBreak || ctx.isExit()) {
          resolve(Defaults.Void);
          return;
        }

        iteratorResult = iterator.next();
        process.nextTick(iteration);
      };

      iteration();
    });
  }
}
