import { ASTChunk } from 'greyscript-core';

import context from '../context';
import { CustomValue } from '../types/generics';
import Block from './block';
import Operation, { CPSVisit } from './operation';

export default class Chunk extends Operation {
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
    this.block = new Block(stack);
    return this;
  }

  handle(ctx: context): Promise<CustomValue> {
    return this.block.handle(ctx);
  }
}
