import { ASTRange } from 'miniscript-core';

import { Instruction } from '../byte-compiler/instruction';

interface RuntimeVM {
  getStacktrace?: () => Instruction[];
  target: string;
}

export class RuntimeError extends Error {
  target: string;
  stackTrace: Instruction[];
  source?: Error;

  constructor(message: string, vm?: RuntimeVM, source?: Error) {
    super(message);
    this.target = vm?.target;
    this.stackTrace = vm?.getStacktrace() ?? [];
    this.stack = this.createTrace();
    this.source = source;
  }

  private createTrace(): string {
    return this.stackTrace
      .map((op: Instruction) => {
        return `at ${op.source ?? 'unknown'}`;
      })
      .join('\n');
  }
}

interface PrepareContext {
  range: ASTRange;
  target: string;
}

export class PrepareError extends Error {
  range: ASTRange;
  target: string;
  source?: Error;

  constructor(message: string, context: PrepareContext, source?: Error) {
    super(message);
    this.range = context.range;
    this.target = context.target;
    this.source = source;
  }
}
