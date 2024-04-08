import {
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression,
  ASTType as ASTTypeExtended,
  Operator as GreybelOperator
} from 'greybel-core';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTCallExpression,
  ASTCallStatement,
  ASTChunk,
  ASTElseClause,
  ASTEvaluationExpression,
  ASTForGenericStatement,
  ASTIdentifier,
  ASTIfClause,
  ASTIfStatement,
  ASTIndexExpression,
  ASTListConstructorExpression,
  ASTMapConstructorExpression,
  ASTMemberExpression,
  ASTParenthesisExpression,
  ASTRange,
  ASTReturnStatement,
  ASTType,
  ASTUnaryExpression,
  ASTWhileStatement,
  Operator
} from 'miniscript-core';

import { DefaultType } from '../types/default';
import { CustomNumber } from '../types/number';
import { CustomString } from '../types/string';
import { PrepareError } from '../utils/error';
import { Context } from './context';
import { BytecodeExpressionGenerator } from './expression';
import { Instruction, OpCode } from './instruction';
import { RuntimeKeyword } from './keywords';
import { LineCallableContext, LineIdentifierContext } from './line';
import {
  IBytecodeExpressionGenerator,
  IBytecodeStatementGenerator,
  ParseCodeFunction
} from './models';
import { Module } from './module';
import { unwrap } from './utils';

export class BytecodeStatementGenerator implements IBytecodeStatementGenerator {
  private context: Context;
  private exprGenerator: IBytecodeExpressionGenerator;
  private parseCode: ParseCodeFunction;

  constructor(context: Context, parseCodeFunction: ParseCodeFunction) {
    this.context = context;
    this.exprGenerator = new BytecodeExpressionGenerator(
      this.context,
      parseCodeFunction,
      this
    );
    this.parseCode = parseCodeFunction;
  }

  async process(node: ASTBase): Promise<void> {
    const mod = this.context.module.peek();

    if (this.context.isDebugMode()) {
      mod.pushCode({
        op: OpCode.BREAKPOINT,
        source: mod.getSourceLocation(node)
      });
    }

    switch (node.type) {
      case ASTType.MemberExpression:
        await this.processMemberExpression(node as ASTMemberExpression);
        return;
      case ASTType.IndexExpression:
        await this.processIndexExpression(node as ASTIndexExpression);
        return;
      case ASTType.SliceExpression:
        return;
      case ASTType.Identifier:
        await this.processIdentifier(node as ASTIdentifier);
        return;
      case ASTType.AssignmentStatement:
        await this.processAssignmentStatement(node as ASTAssignmentStatement);
        return;
      case ASTType.Chunk: {
        const chunk = node as ASTChunk;
        for (const item of chunk.body) {
          await this.process(item);
        }
        return;
      }
      case ASTType.BooleanLiteral:
      case ASTType.StringLiteral:
      case ASTType.NumericLiteral:
      case ASTType.NilLiteral:
        return;
      case ASTType.IsaExpression:
      case ASTType.BinaryExpression:
      case ASTType.LogicalExpression:
        await this.processEvaluationExpression(node as ASTEvaluationExpression);
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
        return;
      case ASTType.WhileStatement:
        await this.processWhileStatement(node as ASTWhileStatement);
        return;
      case ASTType.ParenthesisExpression:
        await this.process((node as ASTParenthesisExpression).expression);
        return;
      case ASTType.BinaryNegatedExpression:
      case ASTType.UnaryExpression:
      case ASTType.NegationExpression:
        await this.processUnaryExpression(node as ASTUnaryExpression);
        return;
      case ASTType.CallStatement:
        await this.process((node as ASTCallStatement).expression);
        return;
      case ASTType.CallExpression:
        await this.processCallExpression(node as ASTCallExpression);
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
        return;
      case ASTTypeExtended.FeatureImportExpression:
        await this.processImportExpression(node as ASTFeatureImportExpression);
        return;
      case ASTTypeExtended.FeatureIncludeExpression:
        await this.processIncludeExpression(
          node as ASTFeatureIncludeExpression
        );
        return;
      case ASTTypeExtended.FeatureDebuggerExpression:
        await this.processDebuggerExpression(node);
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
        invoke: !context?.isReference,
        command: true
      });
    } else {
      await this.exprGenerator.process(base);
      await this.processIdentifier(node.identifier as ASTIdentifier, {
        isDescending: true,
        isReference: !!context?.isReference
      });
    }
  }

  async processIndexExpression(
    node: ASTIndexExpression,
    context?: LineCallableContext
  ): Promise<void> {
    const mod = this.context.module.peek();
    const base = unwrap(node.base);

    if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
      await this.exprGenerator.process(node.index);
      mod.pushCode({
        op: OpCode.GET_SUPER_PROPERTY,
        source: mod.getSourceLocation(node.index, node.type),
        invoke: !context?.isReference,
        command: true
      });
    } else {
      await this.exprGenerator.process(base);
      await this.exprGenerator.process(node.index);
      mod.pushCode({
        op: OpCode.GET_PROPERTY,
        source: mod.getSourceLocation(node.index, node.type),
        invoke: !context?.isReference,
        command: true
      });
    }
  }

  async processIdentifier(
    node: ASTIdentifier,
    context?: LineIdentifierContext
  ): Promise<void> {
    const mod = this.context.module.peek();

    if (!context?.isDescending) {
      switch (node.name) {
        case RuntimeKeyword.Self:
        case RuntimeKeyword.Super:
        case RuntimeKeyword.Outer:
        case RuntimeKeyword.Locals:
        case RuntimeKeyword.Globals: {
          return;
        }
        default: {
          mod.pushCode({
            op: OpCode.GET_VARIABLE,
            source: mod.getSourceLocation(node),
            property: new CustomString(node.name),
            invoke: !context?.isReference,
            command: true
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
        invoke: !context?.isReference,
        command: true
      });
    }
  }

  async processAssignmentStatement(
    node: ASTAssignmentStatement
  ): Promise<void> {
    const mod = this.context.module.peek();
    let variable = unwrap(node.variable);

    if (variable instanceof ASTUnaryExpression) {
      variable = unwrap(variable.argument);
    }

    if (variable instanceof ASTMemberExpression) {
      await this.exprGenerator.process(variable.base);
      mod.pushCode({
        op: OpCode.PUSH,
        source: mod.getSourceLocation(variable.identifier),
        value: new CustomString((variable.identifier as ASTIdentifier).name)
      });
    } else if (variable instanceof ASTIndexExpression) {
      await this.exprGenerator.process(variable.base);
      await this.exprGenerator.process(variable.index);
    } else if (variable instanceof ASTIdentifier) {
      mod.pushCode({
        op: OpCode.GET_LOCALS,
        source: mod.getSourceLocation(variable)
      });
      mod.pushCode({
        op: OpCode.PUSH,
        source: mod.getSourceLocation(variable),
        value: new CustomString(variable.name)
      });
    } else {
      await this.exprGenerator.process(variable);
      mod.pushCode({
        op: OpCode.PUSH,
        source: mod.getSourceLocation(variable),
        value: DefaultType.Void
      });
    }

    await this.exprGenerator.process(node.init, { includeOuter: true });

    mod.pushCode({
      op: OpCode.ASSIGN,
      source: mod.getSourceLocation(node)
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

    await this.exprGenerator.process(node.left);

    if (node.operator === Operator.And) {
      mod.pushCode({
        op: OpCode.GOTO_A_IF_FALSE,
        source: mod.getSourceLocation(node),
        goto: skip
      });
    } else if (node.operator === Operator.Or) {
      mod.pushCode({
        op: OpCode.GOTO_A_IF_TRUE,
        source: mod.getSourceLocation(node),
        goto: skip
      });
    }

    await this.process(node.right);

    switch (node.operator) {
      case Operator.And:
      case Operator.Or: {
        mod.pushCode(skip);
        break;
      }
      case Operator.Isa:
      case Operator.Equal:
      case Operator.NotEqual:
      case Operator.LessThan:
      case Operator.LessThanOrEqual:
      case Operator.GreaterThan:
      case Operator.GreaterThanOrEqual:
      case Operator.Plus:
      case Operator.Minus:
      case Operator.Asterik:
      case Operator.Slash:
      case Operator.Modulo:
      case Operator.Power:
      case GreybelOperator.BitwiseAnd:
      case GreybelOperator.BitwiseOr:
      case GreybelOperator.LeftShift:
      case GreybelOperator.RightShift:
      case GreybelOperator.UnsignedRightShift: {
        break;
      }
      default:
        throw new Error(
          `Unexpected evaluation expression operator. ("${node.operator}")`
        );
    }
  }

  async processReturn(node: ASTReturnStatement): Promise<void> {
    const mod = this.context.module.peek();

    if (mod.isGlobalScope()) {
      if (node.argument) {
        await this.process(node.argument);
      }
      return;
    }

    if (node.argument) {
      await this.exprGenerator.process(node.argument);
    } else {
      mod.pushCode({
        op: OpCode.PUSH,
        source: mod.getSourceLocation(node),
        value: DefaultType.Void
      });
    }

    mod.pushCode({
      op: OpCode.RETURN,
      source: mod.getSourceLocation(node)
    });
  }

  async processBreak(node: ASTBase): Promise<void> {
    const mod = this.context.module.peek();
    const jumpPoint = mod.getJumpPoint();

    if (jumpPoint === null) return;

    const end = jumpPoint[1];

    mod.pushCode({
      op: OpCode.GOTO_A,
      source: mod.getSourceLocation(node),
      goto: end
    });
  }

  async processContinue(node: ASTBase): Promise<void> {
    const mod = this.context.module.peek();
    const jumpPoint = mod.getJumpPoint();

    if (jumpPoint === null) return;

    const start = jumpPoint[0];

    mod.pushCode({
      op: OpCode.GOTO_A,
      source: mod.getSourceLocation(node),
      goto: start
    });
  }

  async processMapConstructorExpression(
    node: ASTMapConstructorExpression
  ): Promise<void> {
    const mod = this.context.module.peek();

    for (const field of node.fields) {
      await this.exprGenerator.process(field.key);
      await this.exprGenerator.process(field.value);
    }

    mod.pushCode({
      op: OpCode.CONSTRUCT_MAP,
      source: mod.getSourceLocation(node),
      length: node.fields.length,
      command: true
    });
  }

  async processListConstructorExpression(
    node: ASTListConstructorExpression
  ): Promise<void> {
    const mod = this.context.module.peek();

    for (const field of node.fields) {
      await this.exprGenerator.process(field.value);
    }

    mod.pushCode({
      op: OpCode.CONSTRUCT_LIST,
      source: mod.getSourceLocation(node),
      length: node.fields.length,
      command: true
    });
  }

  async processWhileStatement(node: ASTWhileStatement): Promise<void> {
    const mod = this.context.module.peek();
    const start = {
      op: OpCode.NOOP,
      source: mod.getSourceLocation(node.condition)
    };
    const end = {
      op: OpCode.NOOP,
      source: mod.getSourceLocation(node)
    };

    mod.pushCode(start);

    await this.exprGenerator.process(node.condition);

    mod.pushCode({
      op: OpCode.GOTO_A_IF_FALSE,
      source: mod.getSourceLocation(node.condition),
      goto: end
    });
    mod.pushJumppoint(start, end);

    for (const item of node.body) {
      await this.process(item);
    }

    mod.popJumppoint();
    mod.pushCode({
      op: OpCode.GOTO_A,
      source: mod.getSourceLocation(node.condition),
      goto: start
    });
    mod.pushCode(end);
  }

  async processUnaryExpression(node: ASTUnaryExpression): Promise<void> {
    const mod = this.context.module.peek();
    const arg = unwrap(node.argument);

    switch (node.operator) {
      case Operator.Reference:
        if (arg instanceof ASTMemberExpression) {
          await this.processMemberExpression(arg, { isReference: true });
        } else if (arg instanceof ASTIndexExpression) {
          await this.processIndexExpression(arg, { isReference: true });
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
        await this.exprGenerator.process(arg);
        mod.pushCode({
          op: OpCode.FALSIFY,
          source: mod.getSourceLocation(node),
          command: true
        });
        return;
      }
      case Operator.Minus: {
        await this.exprGenerator.process(arg);
        mod.pushCode({
          op: OpCode.NEGATE,
          source: mod.getSourceLocation(node),
          command: true
        });
        return;
      }
      case Operator.New: {
        await this.exprGenerator.process(arg);
        mod.pushCode({
          op: OpCode.NEW,
          source: mod.getSourceLocation(node),
          command: true
        });
      }
    }
  }

  async processCallExpression(node: ASTCallExpression): Promise<void> {
    const mod = this.context.module.peek();
    const pushArgs = async () => {
      for (const arg of node.arguments) {
        await this.exprGenerator.process(arg);
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
          length: node.arguments.length,
          command: true
        });
      } else {
        await this.exprGenerator.process(base);
        mod.pushCode({
          op: OpCode.PUSH,
          source: mod.getSourceLocation(left.identifier),
          value: new CustomString((left.identifier as ASTIdentifier).name)
        });
        await pushArgs();
        mod.pushCode({
          op: OpCode.CALL_WITH_CONTEXT,
          source: mod.getSourceLocation(left.identifier, node.type),
          length: node.arguments.length,
          command: true
        });
      }
    } else if (left instanceof ASTIndexExpression) {
      const base = unwrap(left.base);
      if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
        await this.exprGenerator.process(left.index);
        await pushArgs();
        mod.pushCode({
          op: OpCode.CALL_SUPER_PROPERTY,
          source: mod.getSourceLocation(left.index, node.type),
          length: node.arguments.length,
          command: true
        });
      } else {
        await this.exprGenerator.process(base);
        await this.exprGenerator.process(left.index);
        await pushArgs();
        mod.pushCode({
          op: OpCode.CALL_WITH_CONTEXT,
          source: mod.getSourceLocation(left.index, node.type),
          length: node.arguments.length,
          command: true
        });
      }
    } else if (left instanceof ASTIdentifier) {
      await this.exprGenerator.processIdentifier(left, {
        isDescending: false,
        isReference: true
      });
      await pushArgs();
      mod.pushCode({
        op: OpCode.CALL,
        source: mod.getSourceLocation(left, node.type),
        length: node.arguments.length,
        command: true
      });
    } else {
      await this.exprGenerator.process(left);
      await pushArgs();
      mod.pushCode({
        op: OpCode.CALL,
        source: mod.getSourceLocation(left, node.type),
        length: node.arguments.length,
        command: true
      });
    }
  }

  async processIfStatement(node: ASTIfStatement): Promise<void> {
    const mod = this.context.module.peek();
    const end = {
      op: OpCode.NOOP,
      source: mod.getSourceLocation(node)
    };

    for (const clause of node.clauses) {
      if (clause instanceof ASTIfClause) {
        const next = {
          op: OpCode.NOOP,
          source: mod.getSourceLocation(clause)
        };

        await this.exprGenerator.process(clause.condition);
        mod.pushCode({
          op: OpCode.GOTO_A_IF_FALSE,
          source: mod.getSourceLocation(node),
          goto: next
        });

        for (const item of clause.body) {
          await this.process(item);
        }

        mod.pushCode({
          op: OpCode.GOTO_A,
          source: mod.getSourceLocation(node),
          goto: end
        });
        mod.pushCode(next);
      } else if (clause instanceof ASTElseClause) {
        for (const item of clause.body) {
          await this.process(item);
        }
      }
    }

    mod.pushCode(end);
  }

  async processForGenericStatement(
    node: ASTForGenericStatement
  ): Promise<void> {
    const mod = this.context.module.peek();
    const variable = node.variable as ASTIdentifier;
    const idxVariable = new CustomString(`__${variable.name}_idx`);
    const start = {
      op: OpCode.NEXT,
      source: mod.getSourceLocation(node.iterator),
      idxVariable,
      variable: new CustomString(variable.name)
    };
    const end = {
      op: OpCode.POP_ITERATOR,
      source: mod.getSourceLocation(node.iterator)
    };

    mod.pushJumppoint(start, end);
    mod.pushCode({
      op: OpCode.GET_LOCALS,
      source: mod.getSourceLocation(node)
    });
    mod.pushCode({
      op: OpCode.PUSH,
      source: mod.getSourceLocation(node),
      value: idxVariable
    });
    mod.pushCode({
      op: OpCode.PUSH,
      source: mod.getSourceLocation(node),
      value: new CustomNumber(-1)
    });
    mod.pushCode({
      op: OpCode.ASSIGN,
      source: mod.getSourceLocation(node)
    });
    await this.exprGenerator.process(node.iterator);
    mod.pushCode({
      op: OpCode.PUSH_ITERATOR,
      source: mod.getSourceLocation(node.iterator)
    });
    mod.pushCode(start);
    mod.pushCode({
      op: OpCode.GOTO_A_IF_FALSE,
      source: mod.getSourceLocation(node.iterator),
      goto: end
    });

    for (const item of node.body) {
      await this.process(item);
    }

    mod.pushCode({
      op: OpCode.GOTO_A,
      source: mod.getSourceLocation(node.iterator),
      goto: start
    });

    mod.pushCode(end);
    mod.popJumppoint();
  }

  protected async createImport(
    node: ASTFeatureImportExpression,
    path: string,
    code: string
  ) {
    try {
      const mod = new Module(path);

      this.context.target.push(path);
      this.context.module.push(mod);

      const childNodes = this.parseCode(code);

      mod.pushCode({
        op: OpCode.GET_LOCALS,
        source: mod.getInternalLocation()
      });
      mod.pushCode({
        op: OpCode.PUSH,
        source: mod.getInternalLocation(),
        value: new CustomString('module')
      });
      mod.pushCode({
        op: OpCode.PUSH,
        source: mod.getInternalLocation(),
        value: new CustomString('exports')
      });
      mod.pushCode({
        op: OpCode.CONSTRUCT_MAP,
        source: mod.getInternalLocation(),
        length: 0
      });
      mod.pushCode({
        op: OpCode.CONSTRUCT_MAP,
        source: mod.getInternalLocation(),
        length: 1
      });
      mod.pushCode({
        op: OpCode.ASSIGN,
        source: mod.getInternalLocation()
      });

      await this.process(childNodes);

      mod.pushCode({
        op: OpCode.GET_VARIABLE,
        source: mod.getInternalLocation(),
        property: new CustomString('module')
      });
      mod.pushCode({
        op: OpCode.PUSH,
        source: mod.getInternalLocation(),
        value: new CustomString('exports')
      });
      mod.pushCode({
        op: OpCode.GET_PROPERTY,
        source: mod.getInternalLocation()
      });

      this.context.module.pop();
      this.context.target.pop();
      this.context.imports.set(path, mod.getCode());
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

  async processImportExpression(
    node: ASTFeatureImportExpression
  ): Promise<void> {
    const mod = this.context.module.peek();
    const currentTarget = this.context.target.peek();
    const importTarget =
      await this.context.handler.resourceHandler.getTargetRelativeTo(
        currentTarget,
        node.path
      );

    if (this.context.target.includes(importTarget)) {
      console.warn(
        `Found circular dependency between "${currentTarget}" and "${importTarget}" at line ${node.start.line}. Using noop instead to prevent overflow.`
      );
      return;
    }

    if (!this.context.imports.has(importTarget)) {
      const code = await this.context.handler.resourceHandler.get(importTarget);

      if (code == null) {
        const range = new ASTRange(node.start, node.end);

        throw new PrepareError(`Cannot find import "${currentTarget}"`, {
          target: currentTarget,
          range
        });
      }

      await this.createImport(node, importTarget, code);
    }

    mod.pushCode({
      op: OpCode.GET_LOCALS,
      source: mod.getSourceLocation(node)
    });
    mod.pushCode({
      op: OpCode.PUSH,
      source: mod.getSourceLocation(node),
      value: new CustomString((node.name as ASTIdentifier).name)
    });
    mod.pushCode({
      op: OpCode.IMPORT,
      source: mod.getSourceLocation(node),
      path: importTarget
    });
    mod.pushCode({
      op: OpCode.ASSIGN,
      source: mod.getSourceLocation(node)
    });
  }

  async processIncludeExpression(
    node: ASTFeatureIncludeExpression
  ): Promise<void> {
    const currentTarget = this.context.target.peek();
    const importTarget =
      await this.context.handler.resourceHandler.getTargetRelativeTo(
        currentTarget,
        node.path
      );

    if (this.context.target.includes(importTarget)) {
      console.warn(
        `Found circular dependency between "${currentTarget}" and "${importTarget}" at line ${node.start.line}. Using noop instead to prevent overflow.`
      );
      return;
    }

    const code = await this.context.handler.resourceHandler.get(importTarget);

    if (code == null) {
      const range = new ASTRange(node.start, node.end);

      throw new PrepareError(`Cannot find import "${currentTarget}"`, {
        target: currentTarget,
        range
      });
    }

    try {
      this.context.target.push(importTarget);

      const childNodes = this.parseCode(code);

      await this.process(childNodes);
      this.context.target.pop();
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

  async processDebuggerExpression(node: ASTBase): Promise<void> {
    const mod = this.context.module.peek();

    mod.pushCode({
      op: OpCode.BREAKPOINT_ENABLE,
      source: mod.getSourceLocation(node)
    });
    mod.pushCode({
      op: OpCode.BREAKPOINT,
      source: mod.getSourceLocation(node)
    });
  }
}
