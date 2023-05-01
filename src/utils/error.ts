import { ASTBase } from 'greyscript-core';

import { Operation } from '../operations/operation';

interface RuntimeContext {
  stackTrace?: Operation[];
  target: string;
}

export class RuntimeError extends Error {
  relatedTarget: string;
  stackTrace: Operation[];
  source?: Error;

  constructor(message: string, context: RuntimeContext, source?: Error) {
    super(message);
    this.relatedTarget = context.target;
    this.stackTrace = context.stackTrace || [];
    this.stack = this.createTrace();
    this.source = source;
  }

  private createTrace(): string {
    return this.stackTrace
      .map((op: Operation) => {
        return `at ${op.target}:${op.item?.start.line ?? 0}:${
          op.item?.start.character ?? 0
        }`;
      })
      .join('\n');
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
