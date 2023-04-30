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
  source?: Error;

  constructor(message: string, context: RuntimeContext, source?: Error) {
    super(message);
    this.relatedItem = context.stackItem || null;
    this.relatedTarget = context.target;
    this.stackTrace = this.createTrace(context);
    this.source = source;
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
  source?: Error;

  constructor(message: string, context: PrepareContext, source?: Error) {
    super(message);
    this.relatedItem = context.item;
    this.relatedTarget = context.target;
    this.source = source;
  }
}
