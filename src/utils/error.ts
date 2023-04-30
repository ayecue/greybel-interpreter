import { ASTBase } from 'greyscript-core';

interface RuntimeContext {
  previous?: RuntimeContext;
  stackItem?: ASTBase;
  target: string;
}

export class RuntimeError extends Error {
  relatedItem: ASTBase | null;
  relatedTarget: string;
  stackTrace: Set<ASTBase>;

  constructor(message: string, context: RuntimeContext) {
    super(message);
    this.relatedItem = context.stackItem || null;
    this.relatedTarget = context.target;
    this.stackTrace = this.createTrace(context);
  }

  private createTrace(context: RuntimeContext): Set<ASTBase> {
    const result: Set<ASTBase> = new Set();
    let item = context;

    while (item) {
      result.add(item.stackItem);
      item = item.previous;
    }

    return result;
  }
}

interface PrepareContext {
  item: ASTBase;
  target: string;
}

export class PrepareError extends Error {
  relatedItem: ASTBase | null;
  relatedTarget: string;

  constructor(message: string, context: PrepareContext) {
    super(message);
    this.relatedItem = context.item;
    this.relatedTarget = context.target;
  }
}
