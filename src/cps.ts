import { ASTType as ASTTypeExtended } from 'greybel-core';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTCallExpression,
  ASTCallStatement,
  ASTChunk,
  ASTEvaluationExpression,
  ASTForGenericStatement,
  ASTFunctionStatement,
  ASTIfStatement,
  ASTImportCodeExpression,
  ASTListConstructorExpression,
  ASTLiteral,
  ASTMapConstructorExpression,
  ASTReturnStatement,
  ASTType,
  ASTUnaryExpression,
  ASTWhileStatement
} from 'greyscript-core';

import HandlerContainer from './handler-container';
import Assign from './operations/assign';
import Break from './operations/break';
import Call from './operations/call';
import Chunk from './operations/chunk';
import Continue from './operations/continue';
import DebuggerStatement from './operations/debugger-statement';
import Evaluate from './operations/evaluate';
import For from './operations/for';
import FunctionOperation from './operations/function';
import IfStatement from './operations/if-statement';
import Import from './operations/import';
import List from './operations/list';
import Literal from './operations/literal';
import MapOperation from './operations/map';
import NegatedBinary from './operations/negated-binary';
import NewInstance from './operations/new-instance';
import Noop from './operations/noop';
import Not from './operations/not';
import Operation from './operations/operation';
import Resolve from './operations/resolve';
import Return from './operations/return';
import While from './operations/while';

export class CPSContext {
  readonly target: string;
  readonly handler: HandlerContainer;
  currentTarget: string;

  constructor(
    target: string,
    handler: HandlerContainer,
    currentTarget: string = null
  ) {
    this.target = target;
    this.handler = handler;
    this.currentTarget = currentTarget;
  }

  getCurrentTarget(): string {
    return this.currentTarget;
  }
}

export default class CPS {
  private readonly context: CPSContext;

  constructor(context: CPSContext) {
    this.context = context;
  }

  async visit(item: ASTBase): Promise<Operation> {
    const context = this.context;
    const visit = this.visit.bind(this);

    switch (item.type) {
      case ASTType.MapConstructorExpression:
        return new MapOperation(
          item as ASTMapConstructorExpression,
          context.target
        ).build(visit);
      case ASTType.ListConstructorExpression:
        return new List(
          item as ASTListConstructorExpression,
          context.target
        ).build(visit);
      case ASTType.AssignmentStatement:
        return new Assign(item as ASTAssignmentStatement, context.target).build(
          visit
        );
      case ASTType.MemberExpression:
      case ASTType.Identifier:
      case ASTType.IndexExpression:
        return new Resolve(item, context.target).build(visit);
      case ASTType.FunctionDeclaration:
        return new FunctionOperation(
          item as ASTFunctionStatement,
          context.target
        ).build(visit);
      case ASTType.InvalidCodeExpression:
        return new Noop(item).build(visit);
      case ASTType.WhileStatement:
        return new While(item as ASTWhileStatement, context.target).build(
          visit
        );
      case ASTType.ForGenericStatement:
        return new For(item as ASTForGenericStatement, context.target).build(
          visit
        );
      case ASTType.IfStatement:
        return new IfStatement(item as ASTIfStatement, context.target).build(
          visit
        );
      case ASTType.ReturnStatement:
        return new Return(item as ASTReturnStatement, context.target).build(
          visit
        );
      case ASTType.BreakStatement:
        return new Break(item, context.target).build(visit);
      case ASTType.ContinueStatement:
        return new Continue(item, context.target).build(visit);
      case ASTType.CallExpression:
        return new Call(item as ASTCallExpression, context.target).build(visit);
      case ASTType.CallStatement:
        return visit((item as ASTCallStatement).expression);
      case ASTType.ImportCodeExpression: {
        const importExpr = item as ASTImportCodeExpression;
        const target =
          await context.handler.resourceHandler.getTargetRelativeTo(
            context.target,
            importExpr.fileSystemDirectory
          );
        const code = await context.handler.resourceHandler.get(target);

        if (code == null) {
          throw new Error(`Cannot find import ${context.target}.`);
        }

        context.currentTarget = target;

        const importStatement = await new Import(
          importExpr,
          target,
          code
        ).build(visit);
        context.currentTarget = context.target;

        return importStatement;
      }
      case ASTTypeExtended.FeatureDebuggerExpression:
        return new DebuggerStatement(item, context.target);
      case ASTType.BooleanLiteral:
      case ASTType.StringLiteral:
      case ASTType.NumericLiteral:
      case ASTType.NilLiteral:
        return new Literal(item as ASTLiteral, context.target).build(visit);
      case ASTType.EmptyExpression:
        return new Noop(item, context.target).build(visit);
      case ASTType.BinaryExpression:
      case ASTType.LogicalExpression:
        return new Evaluate(
          item as ASTEvaluationExpression,
          context.target
        ).build(visit);
      case ASTType.NegationExpression:
        return new Not(item as ASTUnaryExpression, context.target).build(visit);
      case ASTType.BinaryNegatedExpression:
        return new NegatedBinary(
          item as ASTUnaryExpression,
          context.target
        ).build(visit);
      case ASTType.UnaryExpression: {
        const unaryExpr = item as ASTUnaryExpression;

        if (unaryExpr.operator === 'new') {
          return new NewInstance(unaryExpr).build(visit);
        }

        throw new Error('Unknown unary expression.');
      }
      case ASTType.Chunk:
        return new Chunk(item as ASTChunk, context.target).build(visit);
      default:
        throw new Error(`Unexpected AST type ${item.type}.`);
    }
  }
}
