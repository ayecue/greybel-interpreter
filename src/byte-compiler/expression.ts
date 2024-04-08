import {
  ASTFeatureEnvarExpression,
  ASTType as ASTTypeExtended,
  Operator as GreybelOperator
} from 'greybel-core';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTCallExpression,
  ASTEvaluationExpression,
  ASTFunctionStatement,
  ASTIdentifier,
  ASTIndexExpression,
  ASTListConstructorExpression,
  ASTLiteral,
  ASTMapConstructorExpression,
  ASTMemberExpression,
  ASTParenthesisExpression,
  ASTRange,
  ASTSliceExpression,
  ASTType,
  ASTUnaryExpression,
  Operator
} from 'miniscript-core';
import { basename } from 'path';

import { CustomValue } from '../types/base';
import { DefaultType } from '../types/default';
import { CustomNumber } from '../types/number';
import { CustomString } from '../types/string';
import { PrepareError } from '../utils/error';
import { Context } from './context';
import {
  IBytecodeExpressionGenerator,
  IBytecodeStatementGenerator
} from './generator';
import {
  FunctionDefinitionInstructionArgument,
  Instruction,
  OpCode
} from './instruction';
import { RuntimeKeyword } from './keywords';
import {
  LineCallableContext,
  LineContext,
  LineIdentifierContext
} from './line';
import { generateCustomValueFromASTLiteral, unwrap } from './utils';

export class BytecodeExpressionGenerator
  implements IBytecodeExpressionGenerator
{
  private context: Context;
  private stmtGenerator: IBytecodeStatementGenerator;

  constructor(context: Context, stmtGenerator: IBytecodeStatementGenerator) {
    this.context = context;
    this.stmtGenerator = stmtGenerator;
  }

  async process(node: ASTBase, context?: LineContext): Promise<void> {
    const mod = this.context.module.peek();

    switch (node.type) {
      case ASTType.MemberExpression:
        await this.processMemberExpression(
          node as ASTMemberExpression,
          context
        );
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
        await this.processMapConstructorExpression(
          node as ASTMapConstructorExpression
        );
        return;
      case ASTType.ListConstructorExpression:
        await this.processListConstructorExpression(
          node as ASTMapConstructorExpression
        );
        return;
      case ASTType.FunctionDeclaration:
        await this.processFunctionDeclaration(
          node as ASTFunctionStatement,
          context
        );
        return;
      case ASTType.ParenthesisExpression:
        await this.process((node as ASTParenthesisExpression).expression);
        return;
      case ASTType.BinaryNegatedExpression:
      case ASTType.UnaryExpression:
      case ASTType.NegationExpression:
        await this.processUnaryExpression(node as ASTUnaryExpression);
        return;
      case ASTType.CallExpression:
        await this.processCallExpression(node as ASTCallExpression);
        return;
      case ASTType.EmptyExpression:
        mod.pushCode({
          op: OpCode.PUSH,
          source: mod.getSourceLocation(node),
          value: DefaultType.Void
        });
        return;
      case ASTTypeExtended.FeatureEnvarExpression:
        await this.processEnvarExpression(node as ASTFeatureEnvarExpression);
        return;
      case ASTTypeExtended.FeatureLineExpression:
        mod.pushCode({
          op: OpCode.PUSH,
          source: mod.getSourceLocation(node),
          value: new CustomNumber(node.start.line)
        });
        return;
      case ASTTypeExtended.FeatureFileExpression:
        mod.pushCode({
          op: OpCode.PUSH,
          source: mod.getSourceLocation(node),
          value: new CustomString(basename(this.context.target.peek()))
        });
        return;
      case ASTType.Comment:
        return;
      default: {
        const range = new ASTRange(node.start, node.end);

        throw new PrepareError(`Unexpected AST type ${node.type}`, {
          target: this.context.target.peek(),
          range
        });
      }
    }
  }

  async processMemberExpression(
    node: ASTMemberExpression,
    context?: LineCallableContext
  ): Promise<void> {
    const mod = this.context.module.peek();
    const base = unwrap(node.base);

    if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
      mod.pushCode({
        op: OpCode.PUSH,
        source: mod.getSourceLocation(node.identifier),
        value: new CustomString((node.identifier as ASTIdentifier).name)
      });
      mod.pushCode({
        op: OpCode.GET_SUPER_PROPERTY,
        source: mod.getSourceLocation(node.identifier),
        invoke: !context?.isReference
      });
    } else {
      await this.process(base);
      await this.processIdentifier(node.identifier as ASTIdentifier, {
        isDescending: true,
        isReference: !!context?.isReference
      });
    }
  }

  async processIndexExpression(node: ASTIndexExpression): Promise<void> {
    const mod = this.context.module.peek();
    const base = unwrap(node.base);

    if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
      await this.process(node.index);
      mod.pushCode({
        op: OpCode.GET_SUPER_PROPERTY,
        source: mod.getSourceLocation(node.index, node.type),
        invoke: false
      });
    } else {
      await this.process(base);
      await this.process(node.index);
      mod.pushCode({
        op: OpCode.GET_PROPERTY,
        source: mod.getSourceLocation(node.index, node.type),
        invoke: false
      });
    }
  }

  async processSliceExpression(node: ASTSliceExpression): Promise<void> {
    const mod = this.context.module.peek();

    await this.process(node.base);
    await this.process(node.left);
    await this.process(node.right);

    mod.pushCode({
      op: OpCode.SLICE,
      source: mod.getSourceLocation(node)
    });
  }

  async processIdentifier(
    node: ASTIdentifier,
    context?: LineIdentifierContext
  ): Promise<void> {
    const mod = this.context.module.peek();

    if (!context?.isDescending) {
      switch (node.name) {
        case RuntimeKeyword.Self: {
          mod.pushCode({
            op: OpCode.GET_SELF,
            source: mod.getSourceLocation(node)
          });
          return;
        }
        case RuntimeKeyword.Super: {
          mod.pushCode({
            op: OpCode.GET_SUPER,
            source: mod.getSourceLocation(node)
          });
          return;
        }
        case RuntimeKeyword.Outer: {
          mod.pushCode({
            op: OpCode.GET_OUTER,
            source: mod.getSourceLocation(node)
          });
          return;
        }
        case RuntimeKeyword.Locals: {
          mod.pushCode({
            op: OpCode.GET_LOCALS,
            source: mod.getSourceLocation(node)
          });
          return;
        }
        case RuntimeKeyword.Globals: {
          mod.pushCode({
            op: OpCode.GET_GLOBALS,
            source: mod.getSourceLocation(node)
          });
          return;
        }
        default: {
          mod.pushCode({
            op: OpCode.GET_VARIABLE,
            source: mod.getSourceLocation(node),
            property: new CustomString(node.name),
            invoke: !context?.isReference
          });
        }
      }
    } else {
      mod.pushCode({
        op: OpCode.PUSH,
        source: mod.getSourceLocation(node),
        value: new CustomString(node.name)
      });
      mod.pushCode({
        op: OpCode.GET_PROPERTY,
        source: mod.getSourceLocation(node),
        invoke: !context?.isReference
      });
    }
  }

  async processLiteral(node: ASTLiteral): Promise<void> {
    const mod = this.context.module.peek();
    const value = generateCustomValueFromASTLiteral(node);

    mod.pushCode({
      op: OpCode.PUSH,
      source: mod.getSourceLocation(node),
      value
    });
  }

  async processEvaluationExpression(
    node: ASTEvaluationExpression
  ): Promise<void> {
    const mod = this.context.module.peek();
    const skip: Instruction = {
      op: OpCode.NOOP,
      source: mod.getSourceLocation(node)
    };

    await this.process(node.left);

    if (node.operator === Operator.And) {
      mod.pushCode({
        op: OpCode.GOTO_A_IF_FALSE_AND_PUSH,
        source: mod.getSourceLocation(node),
        goto: skip
      });
    } else if (node.operator === Operator.Or) {
      mod.pushCode({
        op: OpCode.GOTO_A_IF_TRUE_AND_PUSH,
        source: mod.getSourceLocation(node),
        goto: skip
      });
    }

    await this.process(node.right);

    switch (node.operator) {
      case Operator.Isa: {
        mod.pushCode({
          op: OpCode.ISA,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.Equal: {
        mod.pushCode({
          op: OpCode.EQUAL,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.NotEqual: {
        mod.pushCode({
          op: OpCode.NOT_EQUAL,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.LessThan: {
        mod.pushCode({
          op: OpCode.LESS_THAN,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.LessThanOrEqual: {
        mod.pushCode({
          op: OpCode.LESS_THAN_OR_EQUAL,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.GreaterThan: {
        mod.pushCode({
          op: OpCode.GREATER_THAN,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.GreaterThanOrEqual: {
        mod.pushCode({
          op: OpCode.GREATER_THAN_OR_EQUAL,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.And: {
        mod.pushCode({
          op: OpCode.AND,
          source: mod.getSourceLocation(node)
        });
        mod.pushCode(skip);
        break;
      }
      case Operator.Or: {
        mod.pushCode({
          op: OpCode.OR,
          source: mod.getSourceLocation(node)
        });
        mod.pushCode(skip);
        break;
      }
      case Operator.Plus: {
        mod.pushCode({
          op: OpCode.ADD,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.Minus: {
        mod.pushCode({
          op: OpCode.SUB,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.Asterik: {
        mod.pushCode({
          op: OpCode.MUL,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.Slash: {
        mod.pushCode({
          op: OpCode.DIV,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.Modulo: {
        mod.pushCode({
          op: OpCode.MOD,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case Operator.Power: {
        mod.pushCode({
          op: OpCode.POW,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case GreybelOperator.BitwiseAnd: {
        mod.pushCode({
          op: OpCode.BITWISE_AND,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case GreybelOperator.BitwiseOr: {
        mod.pushCode({
          op: OpCode.BITWISE_OR,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case GreybelOperator.LeftShift: {
        mod.pushCode({
          op: OpCode.BITWISE_LEFT_SHIFT,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case GreybelOperator.RightShift: {
        mod.pushCode({
          op: OpCode.BITWISE_RIGHT_SHIFT,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      case GreybelOperator.UnsignedRightShift: {
        mod.pushCode({
          op: OpCode.BITWISE_UNSIGNED_RIGHT_SHIFT,
          source: mod.getSourceLocation(node)
        });
        break;
      }
      default:
        throw new Error(
          `Unexpected evaluation expression operator. ("${node.operator}")`
        );
    }
  }

  async processMapConstructorExpression(
    node: ASTMapConstructorExpression
  ): Promise<void> {
    const mod = this.context.module.peek();

    for (const field of node.fields) {
      await this.process(field.key);
      await this.process(field.value);
    }

    mod.pushCode({
      op: OpCode.CONSTRUCT_MAP,
      source: mod.getSourceLocation(node),
      length: node.fields.length
    });
  }

  async processListConstructorExpression(
    node: ASTListConstructorExpression
  ): Promise<void> {
    const mod = this.context.module.peek();

    for (const field of node.fields) {
      await this.process(field.value);
    }

    mod.pushCode({
      op: OpCode.CONSTRUCT_LIST,
      source: mod.getSourceLocation(node),
      length: node.fields.length
    });
  }

  async processFunctionDeclaration(
    node: ASTFunctionStatement,
    context?: LineContext
  ): Promise<void> {
    const args: FunctionDefinitionInstructionArgument[] = [];

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

    const mod = this.context.module.peek();

    mod.pushContext();

    for (const item of node.body) {
      await this.stmtGenerator.process(item);
    }

    mod.pushCode({
      op: OpCode.PUSH,
      source: mod.getInternalLocation(),
      value: DefaultType.Void
    });

    mod.pushCode({
      op: OpCode.RETURN,
      source: mod.getInternalLocation()
    });

    const fnCode = mod.popContext().code;

    mod.pushCode({
      op: OpCode.FUNCTION_DEFINITION,
      source: mod.getSourceLocation(node),
      arguments: args,
      code: fnCode,
      /*
        Can be removed after MiniScript fixed outer context bug.
      */
      ignoreOuter: !context?.includeOuter
    });
  }

  async processUnaryExpression(node: ASTUnaryExpression): Promise<void> {
    const mod = this.context.module.peek();
    const arg = unwrap(node.argument);

    switch (node.operator) {
      case Operator.Reference:
        if (arg instanceof ASTMemberExpression) {
          await this.processMemberExpression(arg, { isReference: true });
        } else if (arg instanceof ASTIndexExpression) {
          await this.processIndexExpression(arg);
        } else if (arg instanceof ASTIdentifier) {
          await this.processIdentifier(arg, {
            isDescending: false,
            isReference: true
          });
        } else {
          await this.process(arg);
        }
        return;
      case Operator.Not: {
        await this.process(arg);
        mod.pushCode({
          op: OpCode.FALSIFY,
          source: mod.getSourceLocation(node)
        });
        return;
      }
      case Operator.Minus: {
        await this.process(arg);
        mod.pushCode({
          op: OpCode.NEGATE,
          source: mod.getSourceLocation(node)
        });
        return;
      }
      case Operator.New: {
        await this.process(arg);
        mod.pushCode({
          op: OpCode.NEW,
          source: mod.getSourceLocation(node)
        });
      }
    }
  }

  async processCallExpression(node: ASTCallExpression): Promise<void> {
    const mod = this.context.module.peek();
    const pushArgs = async () => {
      for (const arg of node.arguments) {
        await this.process(arg);
      }
    };
    const left = unwrap(node.base);

    if (left instanceof ASTMemberExpression) {
      const base = unwrap(left.base);
      if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
        mod.pushCode({
          op: OpCode.PUSH,
          source: mod.getSourceLocation(left.identifier),
          value: new CustomString((left.identifier as ASTIdentifier).name)
        });
        await pushArgs();
        mod.pushCode({
          op: OpCode.CALL_SUPER_PROPERTY,
          source: mod.getSourceLocation(node.base, node.type),
          length: node.arguments.length
        });
      } else {
        await this.process(base);
        mod.pushCode({
          op: OpCode.PUSH,
          source: mod.getSourceLocation(left.identifier),
          value: new CustomString((left.identifier as ASTIdentifier).name)
        });
        await pushArgs();
        mod.pushCode({
          op: OpCode.CALL_WITH_CONTEXT,
          source: mod.getSourceLocation(left.identifier, node.type),
          length: node.arguments.length
        });
      }
    } else if (left instanceof ASTIndexExpression) {
      const base = unwrap(left.base);
      if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
        await this.process(left.index);
        await pushArgs();
        mod.pushCode({
          op: OpCode.CALL_SUPER_PROPERTY,
          source: mod.getSourceLocation(left.index, node.type),
          length: node.arguments.length
        });
      } else {
        await this.process(base);
        await this.process(left.index);
        await pushArgs();
        mod.pushCode({
          op: OpCode.CALL_WITH_CONTEXT,
          source: mod.getSourceLocation(left.index, node.type),
          length: node.arguments.length
        });
      }
    } else if (left instanceof ASTIdentifier) {
      await this.processIdentifier(left, {
        isDescending: false,
        isReference: true
      });
      await pushArgs();
      mod.pushCode({
        op: OpCode.CALL,
        source: mod.getSourceLocation(left, node.type),
        length: node.arguments.length
      });
    } else {
      await this.process(left);
      await pushArgs();
      mod.pushCode({
        op: OpCode.CALL,
        source: mod.getSourceLocation(left, node.type),
        length: node.arguments.length
      });
    }
  }

  async processEnvarExpression(node: ASTFeatureEnvarExpression): Promise<void> {
    const mod = this.context.module.peek();

    mod.pushCode({
      op: OpCode.PUSH,
      source: mod.getSourceLocation(node),
      value: new CustomString(node.name)
    });
    mod.pushCode({
      op: OpCode.GET_ENVAR,
      source: mod.getSourceLocation(node)
    });
  }
}
