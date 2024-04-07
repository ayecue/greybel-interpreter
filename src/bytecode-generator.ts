import { Instruction, OpCode } from './byte-compiler/instruction';
import { HandlerContainer } from './handler-container';
import { Context } from './byte-compiler/context';
import { BytecodeStatementGenerator } from './byte-compiler/statement';

export interface BytecodeCompileResult {
  code: Instruction[];
  imports: Map<string, Instruction[]>;
}

export interface BytecodeGeneratorContext {
  code: Instruction[];
  jumpPoints: [Instruction, Instruction][];
}

export interface BytecodeConverterOptions {
  target: string;
  handler: HandlerContainer;
  debugMode?: boolean;
}

export class BytecodeGenerator {
  protected handler: HandlerContainer;
  protected context: Context;

  constructor(options: BytecodeConverterOptions) {
    this.handler = options.handler;
    this.context = new Context({
      target: options.target,
      handler: options.handler,
      debugMode: options.debugMode
    });
  }

  async compile(code: string): Promise<BytecodeCompileResult> {
    const statementGenerator = new BytecodeStatementGenerator(this.context);
    const node = this.context.parse(code);

    await statementGenerator.process(node);

    const mod = this.context.module.peek();

    mod.pushCode({
      op: OpCode.HALT,
      source: mod.getSourceLocation(node)
    });

    return {
      code: mod.getCode(),
      imports: this.context.imports
    };
  }
}