import {
  ASTFeatureEnvarExpression,
  ASTFeatureInjectExpression,
  ASTType as ASTTypeExtended,
  Operator as GreybelOperator
} from 'greybel-core';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTBinaryExpression,
  ASTCallExpression,
  ASTComparisonGroupExpression,
  ASTFunctionStatement,
  ASTIdentifier,
  ASTIndexExpression,
  ASTIsaExpression,
  ASTListConstructorExpression,
  ASTLiteral,
  ASTLogicalExpression,
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
        await this.processIndexExpression(node as ASTIndexExpression, context);
        return;
      case ASTType.SliceExpression:
        await this.processSliceExpression(node as ASTSliceExpression, context);
        return;
      case ASTType.Identifier:
        await this.processIdentifier(node as ASTIdentifier, context);
        return;
      case ASTType.BooleanLiteral:
      case ASTType.StringLiteral:
      case ASTType.NumericLiteral:
      case ASTType.NilLiteral:
        await this.processLiteral(node as ASTLiteral);
        return;
      case ASTType.IsaExpression:
        await this.processIsaExpression(node as ASTIsaExpression);
        return;
      case ASTType.BinaryExpression:
        await this.processBinaryExpression(node as ASTBinaryExpression);
        return;
      case ASTType.LogicalExpression:
        await this.processLogicalExpression(node as ASTLogicalExpression);
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
        await this.process(
          (node as ASTParenthesisExpression).expression,
          context
        );
        return;
      case ASTType.BinaryNegatedExpression:
      case ASTType.UnaryExpression:
      case ASTType.NegationExpression:
        await this.processUnaryExpression(node as ASTUnaryExpression, context);
        return;
      case ASTType.CallExpression:
        await this.processCallExpression(node as ASTCallExpression, context);
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
      case ASTTypeExtended.FeatureInjectExpression:
        await this.processInjectExpression(node as ASTFeatureInjectExpression);
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
      case ASTType.ComparisonGroupExpression:
        await this.processComparisonGroupExpression(
          node as ASTComparisonGroupExpression
        );
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
      await this.process(base, { isStatement: !!context?.isStatement });
      await this.processIdentifier(node.identifier as ASTIdentifier, {
        isDescending: true,
        isReference: !!context?.isReference
      });
    }
  }

  async processIndexExpression(
    node: ASTIndexExpression,
    context?: LineContext
  ): Promise<void> {
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
      await this.process(base, { isStatement: !!context?.isStatement });
      await this.process(node.index);
      this.context.pushCode(
        {
          op: OpCode.GET_PROPERTY,
          invoke: !!context?.isStatement
        },
        node.index,
        node.type
      );
    }
  }

  async processSliceExpression(
    node: ASTSliceExpression,
    context?: LineContext
  ): Promise<void> {
    await this.process(node.base, { isStatement: !!context?.isStatement });
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

  async processIsaExpression(node: ASTIsaExpression): Promise<void> {
    await this.process(node.left);
    await this.process(node.right);

    if (node.type !== ASTType.IsaExpression) {
      throw new Error(
        `Unexpected evaluation expression operator. ("${node.operator}")`
      );
    }

    this.context.pushCode(
      {
        op: OpCode.ISA
      },
      node
    );
  }

  async processLogicalExpression(node: ASTLogicalExpression): Promise<void> {
    const skip: ContextInstruction = {
      op: OpCode.NOOP
    };

    let gotoOp: OpCode;
    let actionOp: OpCode;

    if (node.operator === Operator.And) {
      gotoOp = OpCode.GOTO_A_IF_FALSE_AND_PUSH;
      actionOp = OpCode.AND;
    } else if (node.operator === Operator.Or) {
      gotoOp = OpCode.GOTO_A_IF_TRUE_AND_PUSH;
      actionOp = OpCode.OR;
    } else {
      throw new Error(
        `Unexpected evaluation expression operator. ("${node.operator}")`
      );
    }

    await this.process(node.left);

    this.context.pushCode(
      {
        op: gotoOp,
        goto: skip
      },
      node
    );

    await this.process(node.right);

    this.context.pushCode(
      {
        op: actionOp
      },
      node
    );
    this.context.pushCode(skip, node);
  }

  private static binaryExpressionToOp: Record<string, OpCode> = {
    [Operator.Equal]: OpCode.EQUAL,
    [Operator.NotEqual]: OpCode.NOT_EQUAL,
    [Operator.LessThan]: OpCode.LESS_THAN,
    [Operator.LessThanOrEqual]: OpCode.LESS_THAN_OR_EQUAL,
    [Operator.GreaterThan]: OpCode.GREATER_THAN,
    [Operator.GreaterThanOrEqual]: OpCode.GREATER_THAN_OR_EQUAL,
    [Operator.Plus]: OpCode.ADD,
    [Operator.Minus]: OpCode.SUB,
    [Operator.Asterik]: OpCode.MUL,
    [Operator.Slash]: OpCode.DIV,
    [Operator.Modulo]: OpCode.MOD,
    [Operator.Power]: OpCode.POW,
    [GreybelOperator.BitwiseAnd]: OpCode.BITWISE_AND,
    [GreybelOperator.BitwiseOr]: OpCode.BITWISE_OR,
    [GreybelOperator.LeftShift]: OpCode.BITWISE_LEFT_SHIFT,
    [GreybelOperator.RightShift]: OpCode.BITWISE_RIGHT_SHIFT,
    [GreybelOperator.UnsignedRightShift]: OpCode.BITWISE_UNSIGNED_RIGHT_SHIFT
  };

  async processBinaryExpression(node: ASTBinaryExpression): Promise<void> {
    await this.process(node.left);
    await this.process(node.right);

    const opCode: OpCode =
      BytecodeExpressionGenerator.binaryExpressionToOp[node.operator];

    if (opCode == null) {
      throw new Error(
        `Unexpected binary expression operator. ("${node.operator}")`
      );
    }

    this.context.pushCode(
      {
        op: opCode
      },
      node
    );
  }

  async processMapConstructorExpression(
    node: ASTMapConstructorExpression
  ): Promise<void> {
    for (let index = 0; index < node.fields.length; index++) {
      const field = node.fields[index];
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
    for (let index = 0; index < node.fields.length; index++) {
      const field = node.fields[index];
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

    for (let index = 0; index < node.parameters.length; index++) {
      const item = node.parameters[index];
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

    for (let index = 0; index < node.body.length; index++) {
      const item = node.body[index];
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

  async processUnaryExpression(
    node: ASTUnaryExpression,
    context?: LineContext
  ): Promise<void> {
    const arg = unwrap(node.argument);

    switch (node.operator) {
      case Operator.Reference:
        if (arg instanceof ASTMemberExpression) {
          await this.processMemberExpression(arg, {
            isReference: true,
            isStatement: !!context?.isStatement
          });
        } else if (arg instanceof ASTIndexExpression) {
          await this.processIndexExpression(arg, {
            isStatement: !!context?.isStatement
          });
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
        await this.process(arg, { isStatement: !!context?.isStatement });
        this.context.pushCode(
          {
            op: OpCode.FALSIFY
          },
          node
        );
        return;
      }
      case Operator.Minus: {
        await this.process(arg, { isStatement: !!context?.isStatement });
        this.context.pushCode(
          {
            op: OpCode.NEGATE
          },
          node
        );
        return;
      }
      case Operator.New: {
        await this.process(arg, { isStatement: !!context?.isStatement });
        this.context.pushCode(
          {
            op: OpCode.NEW
          },
          node
        );
      }
    }
  }

  async processCallExpression(
    node: ASTCallExpression,
    context?: LineContext
  ): Promise<void> {
    const pushArgs = async () => {
      for (let index = 0; index < node.arguments.length; index++) {
        const arg = node.arguments[index];
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
        await this.process(base, { isStatement: !!context?.isStatement });
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
        await this.process(base, { isStatement: !!context?.isStatement });
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

  async processInjectExpression(
    node: ASTFeatureInjectExpression
  ): Promise<void> {
    const currentTarget = this.context.target.peek();
    const importTarget =
      await this.context.handler.resourceHandler.getTargetRelativeTo(
        currentTarget,
        node.path
      );

    const content = await this.context.handler.resourceHandler.get(
      importTarget
    );

    if (content == null) {
      const range = new ASTRange(node.start, node.end);

      throw new PrepareError(`Cannot find injection "${currentTarget}"`, {
        target: currentTarget,
        range
      });
    }

    const value = new CustomString(content);

    this.context.pushCode(
      {
        op: OpCode.PUSH,
        value
      },
      node
    );
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

  async processComparisonGroupExpression(
    node: ASTComparisonGroupExpression
  ): Promise<void> {
    for (let index = node.expressions.length - 1; index >= 0; index--) {
      await this.process(node.expressions[index]);
    }

    this.context.pushCode(
      {
        op: OpCode.COMPARISON_GROUP,
        operators: node.operators
      },
      node
    );
  }
}
