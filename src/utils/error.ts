import { ASTBase } from 'greyscript-core';

interface RuntimeContext {
  previous?: RuntimeContext;
  stackItem?: ASTBase;
  target: string;
}

export class RuntimeError extends Error {
  relatedItem: ASTBase | null;
  relatedTarget: string;
  source?: Error;

  constructor(message: string, context: RuntimeContext, source?: Error) {
    super(message);
    this.relatedItem = context.stackItem || null;
    this.relatedTarget = context.target;
    this.stack = this.createTrace(context);
    this.source = source;
  }

  private createTrace(context: RuntimeContext): string {
    const related: Map<ASTBase, string> = new Map();
    let item = context;

    while (item) {
      related.set(item.stackItem, item.target);
      item = item.previous;
    }

    const lines: string[] = [];

    for (const [item, target] of related) {
      lines.push(`${target} at ${item.start.line}:${item.start.character}`);
    }

    return lines.join('\n');
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
