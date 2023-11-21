import {
  ASTFeatureEnvarExpression,
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression,
  ASTType as ASTTypeExtended,
  Operator as GreybelOperator,
  Parser
} from 'greybel-core';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTCallExpression,
  ASTCallStatement,
  ASTChunk,
  ASTEvaluationExpression,
  ASTForGenericStatement,
  ASTFunctionStatement,
  ASTIdentifier,
  ASTIfStatement,
  ASTIfClause,
  ASTElseClause,
  ASTListConstructorExpression,
  ASTLiteral,
  ASTMapConstructorExpression,
  ASTParenthesisExpression,
  ASTRange,
  ASTReturnStatement,
  ASTType,
  ASTUnaryExpression,
  ASTWhileStatement,
  ASTSliceExpression,
  ASTIndexExpression,
  ASTMemberExpression,
  Operator
} from 'miniscript-core';
import { PrepareError } from './utils/error';
import { CustomValue } from './types/base';
import { FunctionDefinitionInstructionArgument, Instruction, OpCode, SourceLocation } from './byte-compiler/instruction';
import { CustomNumber } from './types/number';
import { CustomBoolean } from './types/boolean';
import { CustomString } from './types/string';
import { DefaultType } from './types/default';
import { Stack } from './utils/stack';
import { HandlerContainer } from './handler-container';

function generateCustomValueFromASTLiteral(node: ASTLiteral) {
  switch (node.type) {
    case ASTType.BooleanLiteral:
      return new CustomBoolean(node.value as boolean);
    case ASTType.StringLiteral:
      return new CustomString(node.value as string);
    case ASTType.NumericLiteral:
      return new CustomNumber(node.value as number);
    case ASTType.NilLiteral:
      return DefaultType.Void;
    default:
      throw new Error('Unexpected literal type.');
  }
}

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
  protected context: Stack<BytecodeGeneratorContext>;
  protected target: Stack<string>;
  protected debugMode: boolean;
  protected imports: Map<string, Instruction[]>;

  constructor(options: BytecodeConverterOptions) {
    this.target = new Stack(options.target);
    this.handler = options.handler;
    this.context = new Stack({
      code: [],
      jumpPoints: []
    });
    this.imports = new Map();
    this.debugMode = options.debugMode ?? false;
  }

  parse(code: string) {
    const parser = new Parser(code);
    return parser.parseChunk();
  }

  async compile(code: string): Promise<BytecodeCompileResult> {
    const node = this.parse(code);

    await this.processNode(node);

    this.push({
      op: OpCode.HALT,
      source: this.getSourceLocation(node)
    });

    return {
      code: this.context.peek().code,
      imports: this.imports
    };
  }

  protected getCurrentPointer() {
    return this.context.peek().code.length - 1;
  }

  protected getSourceLocation(node: ASTBase): SourceLocation {
    const target = this.target.peek();
    return {
      path: target,
      start: node.start,
      end: node.end
    };
  }

  protected getInternalLocation(): SourceLocation {
    return {
      path: 'internal',
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 }
    };
  }

  protected pushContext() {
    this.context.push({
      code: [],
      jumpPoints: []
    });
  }

  protected popContext() {
    return this.context.pop();
  }

  protected getLastJumpoint() {
    const jumpPoints = this.context.peek().jumpPoints;
    return jumpPoints[jumpPoints.length - 1];
  }

  protected pushJumppoint(start: Instruction, end: Instruction) {
    this.context.peek().jumpPoints.push([start, end]);
  }

  protected popJumppoint() {
    return this.context.peek().jumpPoints.pop();
  }

  protected push(item: Instruction) {
    item.ip = this.getCurrentPointer() + 1;
    this.context.peek().code.push(item);
  }

  protected async processNode(node: ASTBase): Promise<void> {
    if (this.debugMode) {
      this.push({
        op: OpCode.BREAKPOINT,
        source: this.getSourceLocation(node)
      });
    }

    switch (node.type) {
      case ASTType.MemberExpression:
        await this.processMemberExpression(node as ASTMemberExpression);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTType.IndexExpression:
        await this.processIndexExpression(node as ASTIndexExpression);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTType.SliceExpression:
        await this.processSliceExpression(node as ASTSliceExpression);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTType.Identifier:
        await this.processIdentifier(node as ASTIdentifier);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTType.AssignmentStatement:
        await this.processAssignmentStatement(node as ASTAssignmentStatement);
        return;
      case ASTType.Chunk:
        const chunk = node as ASTChunk;
        for (const item of chunk.body) {
          await this.processNode(item);
        }
        return;
      case ASTType.BooleanLiteral:
      case ASTType.StringLiteral:
      case ASTType.NumericLiteral:
      case ASTType.NilLiteral:
        await this.processLiteral(node as ASTLiteral);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTType.IsaExpression:
      case ASTType.BinaryExpression:
      case ASTType.LogicalExpression:
        await this.processEvaluationExpression(node as ASTEvaluationExpression);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTType.ReturnStatement:
        await this.processReturn(node as ASTReturnStatement);
        return;
      case ASTType.BreakStatement:
        await this.processBreak(node);
        return;
      case ASTType.ContinueStatement:
        await this.processContinue(node);
        return;
      case ASTType.MapConstructorExpression:
        await this.processMapConstructorExpression(node as ASTMapConstructorExpression);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTType.ListConstructorExpression:
        await this.processListConstructorExpression(node as ASTMapConstructorExpression);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTType.FunctionDeclaration:
        await this.processFunctionDeclaration(node as ASTFunctionStatement);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTType.WhileStatement:
        await this.processWhileStatement(node as ASTWhileStatement);
        return;
      case ASTType.ParenthesisExpression:
        await this.processNode((node as ASTParenthesisExpression).expression);
        return;
      case ASTType.BinaryNegatedExpression:
      case ASTType.UnaryExpression:
      case ASTType.NegationExpression:
        await this.processUnaryExpression(node as ASTUnaryExpression);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTType.CallStatement:
        await this.processNode((node as ASTCallStatement).expression);
        return;
      case ASTType.CallExpression:
        await this.processCallExpression(node as ASTCallExpression);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTType.IfStatement:
      case ASTType.IfShortcutStatement:
        await this.processIfStatement(node as ASTIfStatement);
        return;
      case ASTType.ForGenericStatement:
        await this.processForGenericStatement(node as ASTForGenericStatement);
        return;
      case ASTType.EmptyExpression:
      case ASTType.Comment:
        return;
      case ASTTypeExtended.FeatureEnvarExpression:
        await this.processEnvarExpression(node as ASTFeatureEnvarExpression);
        this.push({
          op: OpCode.POP,
          source: this.getSourceLocation(node)
        });
        return;
      case ASTTypeExtended.FeatureImportExpression:
        await this.processImportExpression(node as ASTFeatureImportExpression);
        return;
      case ASTTypeExtended.FeatureIncludeExpression:
        await this.processIncludeExpression(node as ASTFeatureIncludeExpression);
        return;
      case ASTTypeExtended.FeatureDebuggerExpression:
        await this.processDebuggerExpression(node);
        return;
      default: {
        const range = new ASTRange(node.start, node.end);
  
        throw new PrepareError(`Unexpected AST type ${node.type}`, {
          target: this.target.peek(),
          range
        });
      }
    }
  }

  protected async processSubNode(node: ASTBase, ignoreOuter: boolean = true): Promise<void> {
    switch (node.type) {
      case ASTType.MemberExpression:
        await this.processMemberExpression(node as ASTMemberExpression);
        return;
      case ASTType.IndexExpression:
        await this.processIndexExpression(node as ASTIndexExpression);
        return;
      case ASTType.SliceExpression:
        await this.processSliceExpression(node as ASTSliceExpression);
        return;
      case ASTType.Identifier:
        await this.processIdentifier(node as ASTIdentifier);
        return;
      case ASTType.BooleanLiteral:
      case ASTType.StringLiteral:
      case ASTType.NumericLiteral:
      case ASTType.NilLiteral:
        await this.processLiteral(node as ASTLiteral);
        return;
      case ASTType.IsaExpression:
      case ASTType.BinaryExpression:
      case ASTType.LogicalExpression:
        await this.processEvaluationExpression(node as ASTEvaluationExpression);
        return;
      case ASTType.MapConstructorExpression:
        await this.processMapConstructorExpression(node as ASTMapConstructorExpression);
        return;
      case ASTType.ListConstructorExpression:
        await this.processListConstructorExpression(node as ASTMapConstructorExpression);
        return;
      case ASTType.FunctionDeclaration:
        await this.processFunctionDeclaration(node as ASTFunctionStatement, ignoreOuter);
        return;
      case ASTType.ParenthesisExpression:
        await this.processSubNode((node as ASTParenthesisExpression).expression);
        return;
      case ASTType.BinaryNegatedExpression:
      case ASTType.UnaryExpression:
      case ASTType.NegationExpression:
        await this.processUnaryExpression(node as ASTUnaryExpression);
        return;
      case ASTType.CallStatement:
        await this.processNode((node as ASTCallStatement).expression);
        return;
      case ASTType.CallExpression:
        await this.processCallExpression(node as ASTCallExpression);
        return;
      case ASTType.EmptyExpression:
        this.push({
          op: OpCode.PUSH,
          source: this.getSourceLocation(node),
          value: DefaultType.Void
        });
        return;
      case ASTTypeExtended.FeatureEnvarExpression:
        await this.processEnvarExpression(node as ASTFeatureEnvarExpression);
        return;
      case ASTType.Comment:
        return;
      default: {
        const range = new ASTRange(node.start, node.end);
  
        throw new PrepareError(`Unexpected AST type ${node.type}`, {
          target: this.target.peek(),
          range
        });
      }
    }
  }

  protected async processMemberExpression(node: ASTMemberExpression, isInvoke: boolean = true): Promise<void> {
    if (node.base instanceof ASTIdentifier && node.base.name === 'super') {
      this.push({
        op: OpCode.PUSH,
        source: this.getSourceLocation(node.identifier),
        value: new CustomString((node.identifier as ASTIdentifier).name)
      });
      this.push({
        op: OpCode.GET_SUPER_PROPERTY,
        source: this.getSourceLocation(node.identifier),
        invoke: isInvoke
      });
    } else {
      await this.processSubNode(node.base);
      if (node.identifier instanceof ASTIdentifier) {
        await this.processIdentifier(node.identifier, false, isInvoke);
      } else {
        await this.processSubNode(node.identifier);
      }
    }
  }

  protected async processIndexExpression(node: ASTIndexExpression, isInvoke: boolean = true): Promise<void> {
    if (node.base instanceof ASTIdentifier && node.base.name === 'super') {
      await this.processSubNode(node.index);
      this.push({
        op: OpCode.GET_SUPER_PROPERTY,
        source: this.getSourceLocation(node),
        invoke: isInvoke
      });
    } else {
      await this.processSubNode(node.base);
      await this.processSubNode(node.index);
      this.push({
        op: OpCode.GET_PROPERTY,
        source: this.getSourceLocation(node.index),
        invoke: isInvoke
      });
    }
  }

  protected async processSliceExpression(node: ASTSliceExpression): Promise<void> {
    await this.processSubNode(node.base);
    await this.processSubNode(node.left);
    await this.processSubNode(node.right);
    this.push({
      op: OpCode.SLICE,
      source: this.getSourceLocation(node)
    });
  }

  protected async processIdentifier(node: ASTIdentifier, isFirst: boolean = true, isInvoke: boolean = true): Promise<void> {
    if (isFirst) {
      switch (node.name) {
        case 'self': {
          this.push({
            op: OpCode.GET_SELF,
            source: this.getSourceLocation(node)
          });
          return;
        }
        case 'super': {
          this.push({
            op: OpCode.GET_SUPER,
            source: this.getSourceLocation(node)
          });
          return;
        }
        case 'outer': {
          this.push({
            op: OpCode.GET_OUTER,
            source: this.getSourceLocation(node)
          });
          return;
        }
        case 'locals': {
          this.push({
            op: OpCode.GET_LOCALS,
            source: this.getSourceLocation(node)
          });
          return;
        }
        case 'globals': {
          this.push({
            op: OpCode.GET_GLOBALS,
            source: this.getSourceLocation(node)
          });
          return;
        }
        default: {
          this.push({
            op: OpCode.GET_VARIABLE,
            source: this.getSourceLocation(node),
            property: new CustomString(node.name),
            invoke: isInvoke
          });
        }
      }
    } else {
      this.push({
        op: OpCode.PUSH,
        source: this.getSourceLocation(node),
        value: new CustomString(node.name)
      })
      this.push({
        op: OpCode.GET_PROPERTY,
        source: this.getSourceLocation(node),
        invoke: isInvoke
      });
    }
  }

  protected async processAssignmentStatement(node: ASTAssignmentStatement): Promise<void> {
    let variable = node.variable;

    if (variable instanceof ASTUnaryExpression) {
      variable = variable.argument;
    }

    if (variable instanceof ASTMemberExpression) {
      await this.processSubNode(variable.base);
      this.push({
        op: OpCode.PUSH,
        source: this.getSourceLocation(variable.identifier),
        value: new CustomString((variable.identifier as ASTIdentifier).name)
      });
    } else if (variable instanceof ASTIndexExpression) {
      await this.processSubNode(variable.base);
      await this.processSubNode(variable.index)
    } else if (variable instanceof ASTIdentifier) {
      this.push({
        op: OpCode.GET_LOCALS,
        source: this.getSourceLocation(variable)
      });
      this.push({
        op: OpCode.PUSH,
        source: this.getSourceLocation(variable),
        value: new CustomString(variable.name)
      });
    } else {
      await this.processSubNode(variable);
      this.push({
        op: OpCode.PUSH,
        source: this.getSourceLocation(variable),
        value: DefaultType.Void
      });
    }

    await this.processSubNode(node.init, false);

    this.push({
      op: OpCode.ASSIGN,
      source: this.getSourceLocation(node)
    });
  }

  protected async processLiteral(node: ASTLiteral): Promise<void> {
    const value = generateCustomValueFromASTLiteral(node);

    this.push({
      op: OpCode.PUSH,
      source: this.getSourceLocation(node),
      value
    });
  }

  protected async processEvaluationExpression(node: ASTEvaluationExpression): Promise<void> {
    await this.processSubNode(node.left);
    await this.processSubNode(node.right);

    switch (node.operator) {
      case Operator.Isa: {
        this.push({
          op: OpCode.ISA,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.Equal: {
        this.push({
          op: OpCode.EQUAL,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.NotEqual: {
        this.push({
          op: OpCode.NOT_EQUAL,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.LessThan: {
        this.push({
          op: OpCode.LESS_THAN,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.LessThanOrEqual: {
        this.push({
          op: OpCode.LESS_THAN_OR_EQUAL,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.GreaterThan: {
        this.push({
          op: OpCode.GREATER_THAN,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.GreaterThanOrEqual: {
        this.push({
          op: OpCode.GREATER_THAN_OR_EQUAL,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.And: {
        this.push({
          op: OpCode.AND,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.Or: {
        this.push({
          op: OpCode.OR,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.Plus: {
        this.push({
          op: OpCode.ADD,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.Minus: {
        this.push({
          op: OpCode.SUB,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.Asterik: {
        this.push({
          op: OpCode.MUL,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.Slash: {
        this.push({
          op: OpCode.DIV,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.Modulo: {
        this.push({
          op: OpCode.MOD,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case Operator.Power: {
        this.push({
          op: OpCode.POW,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case GreybelOperator.BitwiseAnd: {
        this.push({
          op: OpCode.BITWISE_AND,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case GreybelOperator.BitwiseOr: {
        this.push({
          op: OpCode.BITWISE_OR,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case GreybelOperator.LeftShift: {
        this.push({
          op: OpCode.BITWISE_LEFT_SHIFT,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case GreybelOperator.RightShift: {
        this.push({
          op: OpCode.BITWISE_RIGHT_SHIFT,
          source: this.getSourceLocation(node)
        });
        break;
      }
      case GreybelOperator.UnsignedRightShift: {
        this.push({
          op: OpCode.BITWISE_UNSIGNED_RIGHT_SHIFT,
          source: this.getSourceLocation(node)
        });
        break;
      }
      default:
        throw new Error(`Unexpected evaluation expression operator. ("${node.operator}")`);
    }
  }

  protected async processReturn(node: ASTReturnStatement): Promise<void> {
    if (node.argument) {
      await this.processSubNode(node.argument);
    } else {
      this.push({
        op: OpCode.PUSH,
        source: this.getSourceLocation(node),
        value: DefaultType.Void
      });
    }

    this.push({
      op: OpCode.RETURN,
      source: this.getSourceLocation(node)
    });
  }

  protected async processBreak(node: ASTBase): Promise<void> {
    const [_, end] = this.getLastJumpoint();

    this.push({
      op: OpCode.GOTO_A,
      source: this.getSourceLocation(node),
      goto: end
    });
  }

  protected async processContinue(node: ASTBase): Promise<void> {
    const [start] = this.getLastJumpoint();

    this.push({
      op: OpCode.GOTO_A,
      source: this.getSourceLocation(node),
      goto: start
    });
  }

  protected async processMapConstructorExpression(node: ASTMapConstructorExpression): Promise<void> {
    for (const field of node.fields) {
      await this.processSubNode(field.key);
      await this.processSubNode(field.value);
    }

    this.push({
      op: OpCode.CONSTRUCT_MAP,
      source: this.getSourceLocation(node),
      length: node.fields.length
    });
  }

  protected async processListConstructorExpression(node: ASTListConstructorExpression): Promise<void> {
    for (const field of node.fields) {
      await this.processSubNode(field.value);
    }

    this.push({
      op: OpCode.CONSTRUCT_LIST,
      source: this.getSourceLocation(node),
      length: node.fields.length
    });
  }

  protected async processFunctionDeclaration(node: ASTFunctionStatement, ignoreOuter: boolean = false): Promise<void> {
    const args:FunctionDefinitionInstructionArgument[] = [];
    
    for (const item of node.parameters) {
      if (item instanceof ASTIdentifier) {
        args.push({
          name: new CustomString(item.name),
          defaultValue: DefaultType.Void
        });
      } else if (item instanceof ASTAssignmentStatement) {
        let defaultValue: CustomValue = DefaultType.Void;

        if (item.init instanceof ASTLiteral) {
          defaultValue = generateCustomValueFromASTLiteral(item.init);
        }

        args.push({
          name: new CustomString((item.variable as ASTIdentifier).name),
          defaultValue
        });
      }
    }
    
    this.pushContext();

    for (const item of node.body) {
      await this.processNode(item);
    }

    const fnCode = this.popContext().code;

    this.push({
      op: OpCode.FUNCTION_DEFINITION,
      source: this.getSourceLocation(node),
      arguments: args,
      code: fnCode,
      /*
        Can be removed after MiniScript fixed outer context bug.
      */
      ignoreOuter
    });
  }

  protected async processWhileStatement(node: ASTWhileStatement): Promise<void> {
    const start = {
      op: OpCode.NOOP,
      source: this.getSourceLocation(node.condition)
    };
    const end = {
      op: OpCode.NOOP,
      source: this.getSourceLocation(node)
    };

    this.push(start);

    await this.processSubNode(node.condition);

    this.push({
      op: OpCode.GOTO_A_IF_FALSE,
      source: this.getSourceLocation(node.condition),
      goto: end
    });
    this.pushJumppoint(start, end);

    for (const item of node.body) {
      await this.processNode(item);
    }

    this.popJumppoint();
    this.push({
      op: OpCode.GOTO_A,
      source: this.getSourceLocation(node.condition),
      goto: start
    });
    this.push(end);
  }

  protected async processUnaryExpression(node: ASTUnaryExpression): Promise<void> {
    const arg = node.argument;

    switch (node.operator) {
      case Operator.Reference:
        if (arg instanceof ASTMemberExpression) {
          await this.processMemberExpression(arg, false);
        } else if (arg instanceof ASTIndexExpression) {
          await this.processIndexExpression(arg, false);
        } else if (arg instanceof ASTIdentifier) {
          await this.processIdentifier(arg, true, false);
        } else {
          await this.processSubNode(arg);
        }
        return;
      case Operator.Not: {
        await this.processSubNode(arg);
        this.push({
          op: OpCode.FALSIFY,
          source: this.getSourceLocation(node)
        });
        return;
      }
      case Operator.Minus: {
        await this.processSubNode(arg);
        this.push({
          op: OpCode.NEGATE,
          source: this.getSourceLocation(node)
        });
        return;
      }
      case Operator.New: {
        await this.processSubNode(arg);
        this.push({
          op: OpCode.NEW,
          source: this.getSourceLocation(node)
        });
        return;
      }
    }
  }

  protected async processCallExpression(node: ASTCallExpression) {
    const pushArgs = async () => {
      for (const arg of node.arguments) {
        await this.processSubNode(arg);
      }
    }
    const left = node.base;

    if (left instanceof ASTMemberExpression) {
      if (left.base instanceof ASTIdentifier && left.base.name === 'super') {
        this.push({
          op: OpCode.PUSH,
          source: this.getSourceLocation(left.identifier),
          value: new CustomString((left.identifier as ASTIdentifier).name)
        });
        await pushArgs();
        this.push({
          op: OpCode.CALL_SUPER_PROPERTY,
          source: this.getSourceLocation(node),
          length: node.arguments.length
        });
      } else {
        await this.processSubNode(left.base);
        this.push({
          op: OpCode.PUSH,
          source: this.getSourceLocation(left.identifier),
          value: new CustomString((left.identifier as ASTIdentifier).name)
        });
        await pushArgs();
        this.push({
          op: OpCode.CALL_WITH_CONTEXT,
          source: this.getSourceLocation(node),
          length: node.arguments.length
        });
      }
    } else if (left instanceof ASTIndexExpression) {
      if (left.base instanceof ASTIdentifier && left.base.name === 'super') {
        await this.processSubNode(left.index);
        await pushArgs();
        this.push({
          op: OpCode.CALL_SUPER_PROPERTY,
          source: this.getSourceLocation(node),
          length: node.arguments.length
        });
      } else {
        await this.processSubNode(left.base);
        await this.processSubNode(left.index);
        await pushArgs();
        this.push({
          op: OpCode.CALL_WITH_CONTEXT,
          source: this.getSourceLocation(node),
          length: node.arguments.length
        });
      }
    } else if (left instanceof ASTIdentifier) {
      await this.processIdentifier(left, true, false);
      await pushArgs();
      this.push({
        op: OpCode.CALL,
        source: this.getSourceLocation(node),
        length: node.arguments.length
      });
    } else {
      await this.processSubNode(left);
      await pushArgs();
      this.push({
        op: OpCode.CALL,
        source: this.getSourceLocation(node),
        length: node.arguments.length
      });
    }
  }

  protected async processIfStatement(node: ASTIfStatement) {
    const end = {
      op: OpCode.NOOP,
      source: this.getSourceLocation(node)
    };

    for (const clause of node.clauses) {
      if (clause instanceof ASTIfClause) {
        const next = {
          op: OpCode.NOOP,
          source: this.getSourceLocation(clause)
        };

        await this.processSubNode(clause.condition);
        this.push({
          op: OpCode.GOTO_A_IF_FALSE,
          source: this.getSourceLocation(node),
          goto: next
        });

        for (const item of clause.body) {
          await this.processNode(item);
        }

        this.push({
          op: OpCode.GOTO_A,
          source: this.getSourceLocation(node),
          goto: end
        });
        this.push(next);
      } else if (clause instanceof ASTElseClause) {
        for (const item of clause.body) {
          await this.processNode(item);
        }
      }
    }

    this.push(end);
  }

  protected async processForGenericStatement(node: ASTForGenericStatement) {
    const variable = node.variable as ASTIdentifier;
    const idxVariable =  new CustomString(`__${variable.name}_idx`);
    const start = {
      op: OpCode.NEXT,
      source: this.getSourceLocation(node.iterator),
      idxVariable,
      variable: new CustomString(variable.name)
    };
    const end = {
      op: OpCode.POP_ITERATOR,
      source: this.getSourceLocation(node.iterator)
    };

    this.push({
      op: OpCode.GET_LOCALS,
      source: this.getSourceLocation(node)
    });
    this.push({
      op: OpCode.PUSH,
      source: this.getSourceLocation(node),
      value: idxVariable
    });
    this.push({
      op: OpCode.PUSH,
      source: this.getSourceLocation(node),
      value: new CustomNumber(-1)
    });
    this.push({
      op: OpCode.ASSIGN,
      source: this.getSourceLocation(node)
    });
    await this.processSubNode(node.iterator);
    this.push({
      op: OpCode.PUSH_ITERATOR,
      source: this.getSourceLocation(node.iterator)
    });
    this.push(start);
    this.push({
      op: OpCode.GOTO_A_IF_FALSE,
      source: this.getSourceLocation(node.iterator),
      goto: end
    });

    for (const item of node.body) {
      await this.processNode(item);
    }

    this.push({
      op: OpCode.GOTO_A,
      source: this.getSourceLocation(node.iterator),
      goto: start
    });

    this.push(end);
  }

  protected async processEnvarExpression(node: ASTFeatureEnvarExpression) {
    this.push({
      op: OpCode.PUSH,
      source: this.getSourceLocation(node),
      value: new CustomString(node.name)
    });
    this.push({
      op: OpCode.GET_ENVAR,
      source: this.getSourceLocation(node)
    });
  }

  protected async createImport(node: ASTFeatureImportExpression, path: string, code: string) {
    try {
      this.target.push(path);
      this.pushContext();

      const childNodes = this.parse(code);

      this.push({
        op: OpCode.GET_LOCALS,
        source: this.getInternalLocation()
      });
      this.push({
        op: OpCode.PUSH,
        source: this.getInternalLocation(),
        value: new CustomString('module')
      });
      this.push({
        op: OpCode.PUSH,
        source: this.getInternalLocation(),
        value: new CustomString('exports')
      });
      this.push({
        op: OpCode.CONSTRUCT_MAP,
        source: this.getInternalLocation(),
        length: 0
      });
      this.push({
        op: OpCode.CONSTRUCT_MAP,
        source: this.getInternalLocation(),
        length: 1
      });
      this.push({
        op: OpCode.ASSIGN,
        source: this.getInternalLocation(),
      });

      await this.processNode(childNodes);

      this.push({
        op: OpCode.GET_VARIABLE,
        source: this.getInternalLocation(),
        property: new CustomString('module')
      });
      this.push({
        op: OpCode.PUSH,
        source: this.getInternalLocation(),
        value: new CustomString('exports')
      });
      this.push({
        op: OpCode.GET_PROPERTY,
        source: this.getInternalLocation(),
      });
      const context = this.popContext();
      this.target.pop();
      this.imports.set(path, context.code);
    } catch (err: any) {
      if (err instanceof PrepareError) {
        throw err;
      }

      throw new PrepareError(
        err.message,
        {
          target: path,
          range: new ASTRange(node.start, node.end)
        },
        err
      );
    }
  }

  protected async processImportExpression(node: ASTFeatureImportExpression) {
    const currentTarget = this.target.peek();
    const importTarget = await this.handler.resourceHandler.getTargetRelativeTo(
      currentTarget,
      node.path
    );

    if (this.target.includes(importTarget)) {
      console.warn(
        `Found circular dependency between "${currentTarget}" and "${importTarget}" at line ${node.start.line}. Using noop instead to prevent overflow.`
      );
      return;
    }

    if (!this.imports.has(importTarget)) {
      const code = await this.handler.resourceHandler.get(importTarget);

      if (code == null) {
        const range = new ASTRange(node.start, node.end);

        throw new PrepareError(`Cannot find import "${currentTarget}"`, {
          target: currentTarget,
          range
        });
      }
      
      await this.createImport(node, importTarget, code);
    }

    this.push({
      op: OpCode.GET_LOCALS,
      source: this.getSourceLocation(node)
    });
    this.push({
      op: OpCode.PUSH,
      source: this.getSourceLocation(node),
      value: new CustomString((node.name as ASTIdentifier).name),
    });
    this.push({
      op: OpCode.IMPORT,
      source: this.getSourceLocation(node),
      path: importTarget
    });
    this.push({
      op: OpCode.ASSIGN,
      source: this.getSourceLocation(node)
    });
  }

  protected async processIncludeExpression(node: ASTFeatureIncludeExpression) {
    const currentTarget = this.target.peek();
    const importTarget = await this.handler.resourceHandler.getTargetRelativeTo(
      currentTarget,
      node.path
    );

    if (this.target.includes(importTarget)) {
      console.warn(
        `Found circular dependency between "${currentTarget}" and "${importTarget}" at line ${node.start.line}. Using noop instead to prevent overflow.`
      );
      return;
    }

    const code = await this.handler.resourceHandler.get(importTarget);

    if (code == null) {
      const range = new ASTRange(node.start, node.end);

      throw new PrepareError(`Cannot find import "${currentTarget}"`, {
        target: currentTarget,
        range
      });
    }

    try {
      this.target.push(importTarget);

      const childNodes = this.parse(code);
      
      await this.processNode(childNodes);
      this.target.pop();
    } catch (err: any) {
      if (err instanceof PrepareError) {
        throw err;
      }

      throw new PrepareError(
        err.message,
        {
          target: importTarget,
          range: new ASTRange(node.start, node.end)
        },
        err
      );
    }
  }

  protected async processDebuggerExpression(node: ASTBase) {
    this.push({
      op: OpCode.BREAKPOINT_ENABLE,
      source: this.getSourceLocation(node)
    });
    this.push({
      op: OpCode.BREAKPOINT,
      source: this.getSourceLocation(node)
    });
  }
}