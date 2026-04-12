import { Instruction, OpCode } from './bytecode-generator/instruction';
import { HandlerContainer } from './handler-container';
import { Context } from './bytecode-generator/context';
import { BytecodeStatementGenerator } from './bytecode-generator/statement';
import { Parser } from 'greybel-core';
import { PrepareError } from './utils/error';

const parse = function (this: BytecodeGenerator, code: string) {
  try {
    const parser = new Parser(code, {
      environmentVariables: this.environmentVariables,
      strictMode: this.strictMode
    });
    return parser.parseChunk();
  } catch (err: any) {
    if (err instanceof PrepareError) {
      this.context.handler.errorHandler.raise(err);
    } else {
      this.context.handler.errorHandler.raise(
        new PrepareError(err.message, {
          range: err.range,
          target: this.context.target.peek()
        })
      );
    }
  }
}

export interface BytecodeCompileResult {
  code: Instruction[];
  imports: Map<string, Instruction[]>;
}

export interface BytecodeConverterOptions {
  target: string;
  handler: HandlerContainer;
  debugMode?: boolean;
  context?: Context;
  environmentVariables?: Map<string, string>;
  strictMode?: boolean;
}

export class BytecodeGenerator {
  protected context: Context;
  protected environmentVariables: Map<string, string>;
  protected strictMode: boolean;

  constructor(options: BytecodeConverterOptions) {
    this.context = options.context ?? new Context({
      target: options.target,
      handler: options.handler,
      debugMode: options.debugMode
    });
    this.environmentVariables = options.environmentVariables ?? new Map();
    this.strictMode = options.strictMode ?? false;
  }

  async compile(code: string): Promise<BytecodeCompileResult> {
    const statementGenerator = new BytecodeStatementGenerator(this.context, parse.bind(this));
    const node = parse.call(this, code);

    await statementGenerator.process(node);

    const mod = this.context.module.peek();

    this.context.pushCode({
      op: OpCode.HALT
    }, node);

    return {
      code: mod.getCode(),
      imports: this.context.imports
    };
  }
}