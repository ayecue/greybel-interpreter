import { Parser } from 'greybel-core';
import { ASTBase } from 'greyscript-core';

import { ContextState, ContextType, OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { CPSVisit, Operation } from './operation';

export class Include extends Operation {
  readonly item: ASTBase;
  code: string;
  chunk: ASTBase;
  top: Operation;

  constructor(item: ASTBase, target: string, code: string) {
    super(null, target);
    this.item = item;
    this.code = code;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    const parser = new Parser(this.code);
    this.chunk = parser.parseChunk();
    this.top = await visit(this.chunk);
    return this;
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    const importCtx = ctx.fork({
      type: ContextType.External,
      state: ContextState.Temporary,
      target: this.target
    });

    return this.top.handle(importCtx);
  }
}
