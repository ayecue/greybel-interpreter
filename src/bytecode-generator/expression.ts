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
import { Context, ContextInstruction } from './context';
import { FunctionDefinitionInstructionArgument, OpCode } from './instruction';
import { RuntimeKeyword } from './keywords';
import {
  LineCallableContext,
  LineContext,
  LineIdentifierContext
} from './line';
import {
  IBytecodeExpressionGenerator,
  IBytecodeStatementGenerator,
  ParseCodeFunction
} from './models';
import { generateCustomValueFromASTLiteral, unwrap } from './utils';

export class BytecodeExpressionGenerator
  implements IBytecodeExpressionGenerator
{
  protected context: Context;
  protected stmtGenerator: IBytecodeStatementGenerator;
  protected parseCode: ParseCodeFunction;

  constructor(
    context: Context,
    parseCodeFunction: ParseCodeFunction,
    stmtGenerator: IBytecodeStatementGenerator
  ) {
    this.context = context;
    this.parseCode = parseCodeFunction;
    this.stmtGenerator = stmtGenerator;
  }

  async process(node: ASTBase, context?: LineContext): Promise<void> {
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
        this.context.pushCode(
          {
            op: OpCode.PUSH,
            value: DefaultType.Void
          },
          node
        );
        return;
      case ASTTypeExtended.FeatureEnvarExpression:
        await this.processEnvarExpression(node as ASTFeatureEnvarExpression);
        return;
      case ASTTypeExtended.FeatureLineExpression:
        this.context.pushCode(
          {
            op: OpCode.PUSH,
            value: new CustomNumber(node.start.line)
          },
          node
        );
        return;
      case ASTTypeExtended.FeatureFileExpression:
        this.context.pushCode(
          {
            op: OpCode.PUSH,
            value: new CustomString(basename(this.context.target.peek()))
          },
          node
        );
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
    const base = unwrap(node.base);

    if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
      this.context.pushCode(
        {
          op: OpCode.PUSH,
          value: new CustomString((node.identifier as ASTIdentifier).name)
        },
        node.identifier
      );
      this.context.pushCode(
        {
          op: OpCode.GET_SUPER_PROPERTY,
          invoke: !context?.isReference
        },
        node.identifier
      );
    } else {
      await this.process(base);
      await this.processIdentifier(node.identifier as ASTIdentifier, {
        isDescending: true,
        isReference: !!context?.isReference
      });
    }
  }

  async processIndexExpression(node: ASTIndexExpression): Promise<void> {
    const base = unwrap(node.base);

    if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
      await this.process(node.index);
      this.context.pushCode(
        {
          op: OpCode.GET_SUPER_PROPERTY,
          invoke: false
        },
        node.index,
        node.type
      );
    } else {
      await this.process(base);
      await this.process(node.index);
      this.context.pushCode(
        {
          op: OpCode.GET_PROPERTY,
          invoke: false
        },
        node.index,
        node.type
      );
    }
  }

  async processSliceExpression(node: ASTSliceExpression): Promise<void> {
    await this.process(node.base);
    await this.process(node.left);
    await this.process(node.right);

    this.context.pushCode(
      {
        op: OpCode.SLICE
      },
      node
    );
  }

  async processIdentifier(
    node: ASTIdentifier,
    context?: LineIdentifierContext
  ): Promise<void> {
    if (!context?.isDescending) {
      switch (node.name) {
        case RuntimeKeyword.Self: {
          this.context.pushCode(
            {
              op: OpCode.GET_SELF
            },
            node
          );
          return;
        }
        case RuntimeKeyword.Super: {
          this.context.pushCode(
            {
              op: OpCode.GET_SUPER
            },
            node
          );
          return;
        }
        case RuntimeKeyword.Outer: {
          this.context.pushCode(
            {
              op: OpCode.GET_OUTER
            },
            node
          );
          return;
        }
        case RuntimeKeyword.Locals: {
          this.context.pushCode(
            {
              op: OpCode.GET_LOCALS
            },
            node
          );
          return;
        }
        case RuntimeKeyword.Globals: {
          this.context.pushCode(
            {
              op: OpCode.GET_GLOBALS
            },
            node
          );
          return;
        }
        default: {
          this.context.pushCode(
            {
              op: OpCode.GET_VARIABLE,
              property: new CustomString(node.name),
              invoke: !context?.isReference
            },
            node
          );
        }
      }
    } else {
      this.context.pushCode(
        {
          op: OpCode.PUSH,
          value: new CustomString(node.name)
        },
        node
      );
      this.context.pushCode(
        {
          op: OpCode.GET_PROPERTY,
          invoke: !context?.isReference
        },
        node
      );
    }
  }

  async processLiteral(node: ASTLiteral): Promise<void> {
    const value = generateCustomValueFromASTLiteral(node);

    this.context.pushCode(
      {
        op: OpCode.PUSH,
        value
      },
      node
    );
  }

  async processEvaluationExpression(
    node: ASTEvaluationExpression
  ): Promise<void> {
    const skip: ContextInstruction = {
      op: OpCode.NOOP
    };

    await this.process(node.left);

    if (node.operator === Operator.And) {
      this.context.pushCode(
        {
          op: OpCode.GOTO_A_IF_FALSE_AND_PUSH,
          goto: skip
        },
        node
      );
    } else if (node.operator === Operator.Or) {
      this.context.pushCode(
        {
          op: OpCode.GOTO_A_IF_TRUE_AND_PUSH,
          goto: skip
        },
        node
      );
    }

    await this.process(node.right);

    switch (node.operator) {
      case Operator.Isa: {
        this.context.pushCode(
          {
            op: OpCode.ISA
          },
          node
        );
        break;
      }
      case Operator.Equal: {
        this.context.pushCode(
          {
            op: OpCode.EQUAL
          },
          node
        );
        break;
      }
      case Operator.NotEqual: {
        this.context.pushCode(
          {
            op: OpCode.NOT_EQUAL
          },
          node
        );
        break;
      }
      case Operator.LessThan: {
        this.context.pushCode(
          {
            op: OpCode.LESS_THAN
          },
          node
        );
        break;
      }
      case Operator.LessThanOrEqual: {
        this.context.pushCode(
          {
            op: OpCode.LESS_THAN_OR_EQUAL
          },
          node
        );
        break;
      }
      case Operator.GreaterThan: {
        this.context.pushCode(
          {
            op: OpCode.GREATER_THAN
          },
          node
        );
        break;
      }
      case Operator.GreaterThanOrEqual: {
        this.context.pushCode(
          {
            op: OpCode.GREATER_THAN_OR_EQUAL
          },
          node
        );
        break;
      }
      case Operator.And: {
        this.context.pushCode(
          {
            op: OpCode.AND
          },
          node
        );
        this.context.pushCode(skip, node);
        break;
      }
      case Operator.Or: {
        this.context.pushCode(
          {
            op: OpCode.OR
          },
          node
        );
        this.context.pushCode(skip, node);
        break;
      }
      case Operator.Plus: {
        this.context.pushCode(
          {
            op: OpCode.ADD
          },
          node
        );
        break;
      }
      case Operator.Minus: {
        this.context.pushCode(
          {
            op: OpCode.SUB
          },
          node
        );
        break;
      }
      case Operator.Asterik: {
        this.context.pushCode(
          {
            op: OpCode.MUL
          },
          node
        );
        break;
      }
      case Operator.Slash: {
        this.context.pushCode(
          {
            op: OpCode.DIV
          },
          node
        );
        break;
      }
      case Operator.Modulo: {
        this.context.pushCode(
          {
            op: OpCode.MOD
          },
          node
        );
        break;
      }
      case Operator.Power: {
        this.context.pushCode(
          {
            op: OpCode.POW
          },
          node
        );
        break;
      }
      case GreybelOperator.BitwiseAnd: {
        this.context.pushCode(
          {
            op: OpCode.BITWISE_AND
          },
          node
        );
        break;
      }
      case GreybelOperator.BitwiseOr: {
        this.context.pushCode(
          {
            op: OpCode.BITWISE_OR
          },
          node
        );
        break;
      }
      case GreybelOperator.LeftShift: {
        this.context.pushCode(
          {
            op: OpCode.BITWISE_LEFT_SHIFT
          },
          node
        );
        break;
      }
      case GreybelOperator.RightShift: {
        this.context.pushCode(
          {
            op: OpCode.BITWISE_RIGHT_SHIFT
          },
          node
        );
        break;
      }
      case GreybelOperator.UnsignedRightShift: {
        this.context.pushCode(
          {
            op: OpCode.BITWISE_UNSIGNED_RIGHT_SHIFT
          },
          node
        );
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
    for (const field of node.fields) {
      await this.process(field.key);
      await this.process(field.value);
    }

    this.context.pushCode(
      {
        op: OpCode.CONSTRUCT_MAP,
        length: node.fields.length
      },
      node
    );
  }

  async processListConstructorExpression(
    node: ASTListConstructorExpression
  ): Promise<void> {
    for (const field of node.fields) {
      await this.process(field.value);
    }

    this.context.pushCode(
      {
        op: OpCode.CONSTRUCT_LIST,
        length: node.fields.length
      },
      node
    );
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

    this.context.pushInternalCode({
      op: OpCode.PUSH,
      value: DefaultType.Void
    });

    this.context.pushInternalCode({
      op: OpCode.RETURN
    });

    const fnCode = mod.popContext().code;

    this.context.pushCode(
      {
        op: OpCode.FUNCTION_DEFINITION,
        arguments: args,
        code: fnCode,
        /*
        Can be removed after MiniScript fixed outer context bug.
      */
        ignoreOuter: !context?.includeOuter
      },
      node
    );
  }

  async processUnaryExpression(node: ASTUnaryExpression): Promise<void> {
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
        this.context.pushCode(
          {
            op: OpCode.FALSIFY
          },
          node
        );
        return;
      }
      case Operator.Minus: {
        await this.process(arg);
        this.context.pushCode(
          {
            op: OpCode.NEGATE
          },
          node
        );
        return;
      }
      case Operator.New: {
        await this.process(arg);
        this.context.pushCode(
          {
            op: OpCode.NEW
          },
          node
        );
      }
    }
  }

  async processCallExpression(node: ASTCallExpression): Promise<void> {
    const pushArgs = async () => {
      for (const arg of node.arguments) {
        await this.process(arg);
      }
    };
    const left = unwrap(node.base);

    if (left instanceof ASTMemberExpression) {
      const base = unwrap(left.base);
      if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
        this.context.pushCode(
          {
            op: OpCode.PUSH,
            value: new CustomString((left.identifier as ASTIdentifier).name)
          },
          left.identifier
        );
        await pushArgs();
        this.context.pushCode(
          {
            op: OpCode.CALL_SUPER_PROPERTY,
            length: node.arguments.length
          },
          node.base,
          node.type
        );
      } else {
        await this.process(base);
        this.context.pushCode(
          {
            op: OpCode.PUSH,
            value: new CustomString((left.identifier as ASTIdentifier).name)
          },
          left.identifier
        );
        await pushArgs();
        this.context.pushCode(
          {
            op: OpCode.CALL_WITH_CONTEXT,
            length: node.arguments.length
          },
          left.identifier,
          node.type
        );
      }
    } else if (left instanceof ASTIndexExpression) {
      const base = unwrap(left.base);
      if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
        await this.process(left.index);
        await pushArgs();
        this.context.pushCode(
          {
            op: OpCode.CALL_SUPER_PROPERTY,
            length: node.arguments.length
          },
          left.index,
          node.type
        );
      } else {
        await this.process(base);
        await this.process(left.index);
        await pushArgs();
        this.context.pushCode(
          {
            op: OpCode.CALL_WITH_CONTEXT,
            length: node.arguments.length
          },
          left.index,
          node.type
        );
      }
    } else if (left instanceof ASTIdentifier) {
      await this.processIdentifier(left, {
        isDescending: false,
        isReference: true
      });
      await pushArgs();
      this.context.pushCode(
        {
          op: OpCode.CALL,
          length: node.arguments.length
        },
        left,
        node.type
      );
    } else {
      await this.process(left);
      await pushArgs();
      this.context.pushCode(
        {
          op: OpCode.CALL,
          length: node.arguments.length
        },
        left,
        node.type
      );
    }
  }

  async processEnvarExpression(node: ASTFeatureEnvarExpression): Promise<void> {
    this.context.pushCode(
      {
        op: OpCode.PUSH,
        value: new CustomString(node.name)
      },
      node
    );
    this.context.pushCode(
      {
        op: OpCode.GET_ENVAR
      },
      node
    );
  }
}
