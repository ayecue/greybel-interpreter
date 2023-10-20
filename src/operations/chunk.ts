import { ASTChunk } from 'greyscript-core';

import { OperationContext } from '../context';
import { CustomValue } from '../types/base';
import { Block } from './block';
import { CPSVisit, Operation, OperationBlock } from './operation';

export class Chunk extends OperationBlock {
  readonly item: ASTChunk;
  block: Block;

  constructor(item: ASTChunk, target?: string) {
    super(null, target);
    this.item = item;
  }

  async build(visit: CPSVisit): Promise<Operation> {
    const stack = await Promise.all(
      this.item.body.map((child) => visit(child))
    );
    this.block = new Block(this.item, stack);
    return this;
  }

  handle(ctx: OperationContext): Promise<CustomValue> {
    return this.block.handle(ctx);
  }
}
