import {
  ASTFeatureEnvarExpression,
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression,
  ASTType as ASTTypeExtended
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
  ASTIfStatement,
  ASTImportCodeExpression,
  ASTListConstructorExpression,
  ASTLiteral,
  ASTMapConstructorExpression,
  ASTParenthesisExpression,
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
import FunctionReference from './operations/function-reference';
import IfStatement from './operations/if-statement';
import Import from './operations/import';
import Include from './operations/include';
import List from './operations/list';
import Literal from './operations/literal';
import MapOperation from './operations/map';
import NegatedBinary from './operations/negated-binary';
import NewInstance from './operations/new-instance';
import Noop from './operations/noop';
import Not from './operations/not';
import Operation, { CPSVisit } from './operations/operation';
import Resolve from './operations/resolve';
import Return from './operations/return';
import While from './operations/while';
import EnvarExpression from './operations/envar';

export class CPSContext {
  readonly target: string;
  readonly handler: HandlerContainer;

  constructor(target: string, handler: HandlerContainer) {
    this.target = target;
    this.handler = handler;
  }
}

const visit = async (
  context: CPSContext,
  stack: string[],
  item: ASTBase
): Promise<Operation> => {
  const currentTarget = stack[stack.length - 1];
  const defaultVisit = visit.bind(null, context, stack);

  switch (item.type) {
    case ASTType.MapConstructorExpression:
      return new MapOperation(
        item as ASTMapConstructorExpression,
        currentTarget
      ).build(defaultVisit);
    case ASTType.ListConstructorExpression:
      return new List(
        item as ASTListConstructorExpression,
        currentTarget
      ).build(defaultVisit);
    case ASTType.AssignmentStatement:
      return new Assign(item as ASTAssignmentStatement, currentTarget).build(
        defaultVisit
      );
    case ASTType.MemberExpression:
    case ASTType.Identifier:
    case ASTType.IndexExpression:
      return new Resolve(item, currentTarget).build(defaultVisit);
    case ASTType.FunctionDeclaration:
      return new FunctionOperation(
        item as ASTFunctionStatement,
        currentTarget
      ).build(defaultVisit);
    case ASTType.InvalidCodeExpression:
      return new Noop(item, currentTarget).build(defaultVisit);
    case ASTType.WhileStatement:
      return new While(item as ASTWhileStatement, currentTarget).build(
        defaultVisit
      );
    case ASTType.ForGenericStatement:
      return new For(item as ASTForGenericStatement, currentTarget).build(
        defaultVisit
      );
    case ASTType.IfStatement:
    case ASTType.IfShortcutStatement:
      return new IfStatement(item as ASTIfStatement, currentTarget).build(
        defaultVisit
      );
    case ASTType.ReturnStatement:
      return new Return(item as ASTReturnStatement, currentTarget).build(
        defaultVisit
      );
    case ASTType.BreakStatement:
      return new Break(item, currentTarget).build(defaultVisit);
    case ASTType.ContinueStatement:
      return new Continue(item, currentTarget).build(defaultVisit);
    case ASTType.CallExpression:
      return new Call(item as ASTCallExpression, currentTarget).build(
        defaultVisit
      );
    case ASTType.CallStatement:
      return defaultVisit((item as ASTCallStatement).expression);
    case ASTTypeExtended.FeatureImportExpression: {
      const importExpr = item as ASTFeatureImportExpression;
      const target = await context.handler.resourceHandler.getTargetRelativeTo(
        currentTarget,
        importExpr.path
      );

      if (stack.includes(target)) {
        console.warn('Found circluar dependency. Using noop operation.');
        return new Noop(item, target);
      }

      const code = await context.handler.resourceHandler.get(target);

      if (code == null) {
        throw new Error(`Cannot find import ${currentTarget}.`);
      }

      const subVisit = visit.bind(null, context, [...stack, target]);
      const importStatement = await new Import(importExpr, target, code).build(
        subVisit
      );

      return importStatement;
    }
    case ASTTypeExtended.FeatureIncludeExpression: {
      const includeExpr = item as ASTFeatureIncludeExpression;
      const target = await context.handler.resourceHandler.getTargetRelativeTo(
        currentTarget,
        includeExpr.path
      );

      if (stack.includes(target)) {
        console.warn('Found circluar dependency. Using noop operation.');
        return new Noop(item, target);
      }

      const code = await context.handler.resourceHandler.get(target);

      if (code == null) {
        throw new Error(`Cannot find include ${currentTarget}.`);
      }

      const subVisit = visit.bind(null, context, [...stack, target]);
      const importStatement = await new Include(
        includeExpr,
        target,
        code
      ).build(subVisit);

      return importStatement;
    }
    case ASTType.ImportCodeExpression: {
      const importExpr = item as ASTImportCodeExpression;
      const target = await context.handler.resourceHandler.getTargetRelativeTo(
        currentTarget,
        importExpr.fileSystemDirectory
      );

      if (stack.includes(target)) {
        console.warn('Found circluar dependency. Using noop operation.');
        return new Noop(item, target);
      }

      const code = await context.handler.resourceHandler.get(target);

      if (code == null) {
        throw new Error(`Cannot find native import ${currentTarget}.`);
      }

      const subVisit = visit.bind(null, context, [...stack, target]);
      const importStatement = await new Include(importExpr, target, code).build(
        subVisit
      );

      return importStatement;
    }
    case ASTTypeExtended.FeatureDebuggerExpression:
      return new DebuggerStatement(item, currentTarget);
    case ASTTypeExtended.FeatureEnvarExpression:
      return new EnvarExpression(item as ASTFeatureEnvarExpression, currentTarget);
    case ASTType.BooleanLiteral:
    case ASTType.StringLiteral:
    case ASTType.NumericLiteral:
    case ASTType.NilLiteral:
      return new Literal(item as ASTLiteral, currentTarget).build(defaultVisit);
    case ASTType.EmptyExpression:
      return new Noop(item, currentTarget).build(defaultVisit);
    case ASTType.IsaExpression:
    case ASTType.BinaryExpression:
    case ASTType.LogicalExpression:
      return new Evaluate(item as ASTEvaluationExpression, currentTarget).build(
        defaultVisit
      );
    case ASTType.NegationExpression:
      return new Not(item as ASTUnaryExpression, currentTarget).build(
        defaultVisit
      );
    case ASTType.BinaryNegatedExpression:
      return new NegatedBinary(item as ASTUnaryExpression, currentTarget).build(
        defaultVisit
      );
    case ASTType.UnaryExpression: {
      const unaryExpr = item as ASTUnaryExpression;

      if (unaryExpr.operator === 'new') {
        return new NewInstance(unaryExpr).build(defaultVisit);
      } else if (unaryExpr.operator === '@') {
        return new FunctionReference(unaryExpr).build(defaultVisit);
      }

      throw new Error('Unknown unary expression.');
    }
    case ASTType.Chunk:
      return new Chunk(item as ASTChunk, currentTarget).build(defaultVisit);
    case ASTType.Comment:
      return new Noop(item, currentTarget);
    case ASTType.ParenthesisExpression:
      return defaultVisit((item as ASTParenthesisExpression).expression);
    default:
      throw new Error(`Unexpected AST type ${item.type}.`);
  }
};

export default class CPS {
  private readonly context: CPSContext;
  private __visit: CPSVisit;

  constructor(context: CPSContext) {
    this.context = context;
    this.__visit = visit.bind(null, context, [context.target]);
  }

  visit(item: ASTBase): Promise<Operation> {
    return this.__visit(item);
  }
}
