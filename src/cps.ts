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
  ASTIdentifier,
  ASTIfStatement,
  ASTListConstructorExpression,
  ASTLiteral,
  ASTMapConstructorExpression,
  ASTParenthesisExpression,
  ASTRange,
  ASTReturnStatement,
  ASTType,
  ASTUnaryExpression,
  ASTWhileStatement
} from 'miniscript-core';

import { HandlerContainer } from './handler-container';
import { Break } from './operations/break';
import { Call } from './operations/call';
import { Chunk } from './operations/chunk';
import { Continue } from './operations/continue';
import { DebuggerStatement } from './operations/debugger-statement';
import { EnvarExpression } from './operations/envar';
import { Evaluate } from './operations/evaluate';
import { For } from './operations/for';
import { FunctionOperation } from './operations/function';
import { FunctionReference } from './operations/function-reference';
import { IfStatement } from './operations/if-statement';
import { Import } from './operations/import';
import { Include } from './operations/include';
import { List } from './operations/list';
import { Literal } from './operations/literal';
import { MapOperation } from './operations/map';
import { NegatedBinary } from './operations/negated-binary';
import { NewInstance } from './operations/new-instance';
import { Noop } from './operations/noop';
import { Not } from './operations/not';
import { CPSVisit, Operation } from './operations/operation';
import { Resolve } from './operations/resolve';
import { Return } from './operations/return';
import { While } from './operations/while';
import { PrepareError } from './utils/error';
import { createIdentifierResolve, createResolve } from './utils/create-resolve';
import { createAssign } from './utils/create-assign';

export class CPSContext {
  readonly target: string;
  readonly handler: HandlerContainer;

  constructor(target: string, handler: HandlerContainer) {
    this.target = target;
    this.handler = handler;
  }
}

export type CPSVisitCallback = (
  context: CPSContext,
  stack: string[],
  item: ASTBase
) => Promise<Operation>;

export const defaultCPSVisit: CPSVisitCallback = async (
  context: CPSContext,
  stack: string[],
  item: ASTBase
): Promise<Operation> => {
  const currentTarget = stack[stack.length - 1];
  const defaultVisit = defaultCPSVisit.bind(null, context, stack);

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
      return createAssign(item as ASTAssignmentStatement, currentTarget).build(
        defaultVisit
      );
    case ASTType.MemberExpression:
    case ASTType.IndexExpression:
    case ASTType.SliceExpression:
      return createResolve(item, currentTarget).build(defaultVisit);
    case ASTType.Identifier:
      return createIdentifierResolve(item as ASTIdentifier, currentTarget).build(defaultVisit);
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
        console.warn(
          `Found circular dependency between "${currentTarget}" and "${target}" at line ${item.start.line}. Using noop instead to prevent overflow.`
        );
        return new Noop(item, target);
      }

      const code = await context.handler.resourceHandler.get(target);

      if (code == null) {
        const range = new ASTRange(item.start, item.end);

        throw new PrepareError(`Cannot find import "${currentTarget}"`, {
          target: currentTarget,
          range
        });
      }

      try {
        const subVisit = defaultCPSVisit.bind(null, context, [...stack, target]);
        const importStatement = await new Import(
          importExpr,
          currentTarget,
          target,
          code
        ).build(subVisit);

        return importStatement;
      } catch (err: any) {
        if (err instanceof PrepareError) {
          throw err;
        }

        throw new PrepareError(
          err.message,
          {
            target,
            range: new ASTRange(item.start, item.end)
          },
          err
        );
      }
    }
    case ASTTypeExtended.FeatureIncludeExpression: {
      const includeExpr = item as ASTFeatureIncludeExpression;
      const target = await context.handler.resourceHandler.getTargetRelativeTo(
        currentTarget,
        includeExpr.path
      );

      if (stack.includes(target)) {
        console.warn(
          `Found circular dependency between "${currentTarget}" and "${target}" at line ${item.start.line}. Using noop instead to prevent overflow.`
        );
        return new Noop(item, target);
      }

      const code = await context.handler.resourceHandler.get(target);

      if (code == null) {
        const range = new ASTRange(item.start, item.end);

        throw new PrepareError(`Cannot find include "${currentTarget}"`, {
          target: currentTarget,
          range
        });
      }

      try {
        const subVisit = defaultCPSVisit.bind(null, context, [...stack, target]);
        const importStatement = await new Include(
          includeExpr,
          currentTarget,
          target,
          code
        ).build(subVisit);

        return importStatement;
      } catch (err: any) {
        if (err instanceof PrepareError) {
          throw err;
        }

        throw new PrepareError(
          err.message,
          {
            target,
            range: new ASTRange(item.start, item.end)
          },
          err
        );
      }
    }
    case ASTTypeExtended.FeatureDebuggerExpression:
      return new DebuggerStatement(item, currentTarget);
    case ASTTypeExtended.FeatureEnvarExpression:
      return new EnvarExpression(
        item as ASTFeatureEnvarExpression,
        currentTarget
      );
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

      const range = new ASTRange(item.start, item.end);

      throw new PrepareError(`Unknown unary expression`, {
        target: currentTarget,
        range
      });
    }
    case ASTType.Chunk:
      return new Chunk(item as ASTChunk, currentTarget).build(defaultVisit);
    case ASTType.Comment:
      return new Noop(item, currentTarget);
    case ASTType.ParenthesisExpression:
      return defaultVisit((item as ASTParenthesisExpression).expression);
    default: {
      const range = new ASTRange(item.start, item.end);

      throw new PrepareError(`Unexpected AST type ${item.type}`, {
        target: currentTarget,
        range
      });
    }
  }
};

export class CPS {
  private readonly context: CPSContext;
  private __visit: CPSVisit;

  constructor(context: CPSContext, cpsVisit: CPSVisitCallback = defaultCPSVisit) {
    this.context = context;
    this.__visit = cpsVisit.bind(null, context, [context.target]);
  }

  visit(item: ASTBase): Promise<Operation> {
    return this.__visit(item);
  }
}
