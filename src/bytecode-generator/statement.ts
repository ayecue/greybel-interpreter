import {
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
  ASTElseClause,
  ASTForGenericStatement,
  ASTIdentifier,
  ASTIfClause,
  ASTIfStatement,
  ASTIndexExpression,
  ASTListConstructorExpression,
  ASTLogicalExpression,
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
import { Context, ContextInstruction } from './context';
import { BytecodeExpressionGenerator } from './expression';
import { OpCode } from './instruction';
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
  protected context: Context;
  protected exprGenerator: IBytecodeExpressionGenerator;
  protected parseCode: ParseCodeFunction;

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
    if (this.context.isDebugMode()) {
      this.context.pushCode(
        {
          op: OpCode.BREAKPOINT
        },
        node
      );
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
        return;
      case ASTType.LogicalExpression:
        await this.exprGenerator.processLogicalExpression(
          node as ASTLogicalExpression
        );
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
        await this.processCallExpression(
          (node as ASTCallStatement).expression as ASTCallExpression
        );
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
      case ASTTypeExtended.FeatureInjectExpression:
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
          invoke: !context?.isReference,
          command: true
        },
        node.identifier
      );
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
    const base = unwrap(node.base);

    if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
      await this.exprGenerator.process(node.index);
      this.context.pushCode(
        {
          op: OpCode.GET_SUPER_PROPERTY,
          invoke: !context?.isReference,
          command: true
        },
        node.index,
        node.type
      );
    } else {
      await this.exprGenerator.process(base);
      await this.exprGenerator.process(node.index);
      this.context.pushCode(
        {
          op: OpCode.GET_PROPERTY,
          invoke: !context?.isReference,
          command: true
        },
        node.index,
        node.type
      );
    }
  }

  async processIdentifier(
    node: ASTIdentifier,
    context?: LineIdentifierContext
  ): Promise<void> {
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
          this.context.pushCode(
            {
              op: OpCode.GET_VARIABLE,
              property: new CustomString(node.name),
              invoke: !context?.isReference,
              command: true
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
          invoke: !context?.isReference,
          command: true
        },
        node
      );
    }
  }

  async processAssignmentStatement(
    node: ASTAssignmentStatement
  ): Promise<void> {
    let variable = unwrap(node.variable);

    if (variable instanceof ASTUnaryExpression) {
      variable = unwrap(variable.argument);
    }

    if (variable instanceof ASTMemberExpression) {
      await this.exprGenerator.process(variable.base);
      this.context.pushCode(
        {
          op: OpCode.PUSH,
          value: new CustomString((variable.identifier as ASTIdentifier).name)
        },
        variable.identifier
      );
    } else if (variable instanceof ASTIndexExpression) {
      await this.exprGenerator.process(variable.base);
      await this.exprGenerator.process(variable.index);
    } else if (variable instanceof ASTIdentifier) {
      this.context.pushCode(
        {
          op: OpCode.GET_LOCALS
        },
        variable
      );
      this.context.pushCode(
        {
          op: OpCode.PUSH,
          value: new CustomString(variable.name)
        },
        variable
      );
    } else {
      await this.exprGenerator.process(variable);
      this.context.pushCode(
        {
          op: OpCode.PUSH,
          value: DefaultType.Void
        },
        variable
      );
    }

    await this.exprGenerator.process(node.init, { includeOuter: true });

    this.context.pushCode(
      {
        op: OpCode.ASSIGN
      },
      node
    );
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
      this.context.pushCode(
        {
          op: OpCode.PUSH,
          value: DefaultType.Void
        },
        node
      );
    }

    this.context.pushCode(
      {
        op: OpCode.RETURN
      },
      node
    );
  }

  async processBreak(node: ASTBase): Promise<void> {
    const mod = this.context.module.peek();
    const jumpPoint = mod.getJumpPoint();

    if (jumpPoint === null) return;

    const end = jumpPoint[1];

    this.context.pushCode(
      {
        op: OpCode.GOTO_A,
        goto: end
      },
      node
    );
  }

  async processContinue(node: ASTBase): Promise<void> {
    const mod = this.context.module.peek();
    const jumpPoint = mod.getJumpPoint();

    if (jumpPoint === null) return;

    const start = jumpPoint[0];

    this.context.pushCode(
      {
        op: OpCode.GOTO_A,
        goto: start
      },
      node
    );
  }

  async processMapConstructorExpression(
    node: ASTMapConstructorExpression
  ): Promise<void> {
    for (const field of node.fields) {
      await this.exprGenerator.process(field.key);
      await this.exprGenerator.process(field.value);
    }

    this.context.pushCode(
      {
        op: OpCode.CONSTRUCT_MAP,
        length: node.fields.length,
        command: true
      },
      node
    );
  }

  async processListConstructorExpression(
    node: ASTListConstructorExpression
  ): Promise<void> {
    for (const field of node.fields) {
      await this.exprGenerator.process(field.value);
    }

    this.context.pushCode(
      {
        op: OpCode.CONSTRUCT_LIST,
        length: node.fields.length,
        command: true
      },
      node
    );
  }

  async processWhileStatement(node: ASTWhileStatement): Promise<void> {
    const mod = this.context.module.peek();
    const start: ContextInstruction = {
      op: OpCode.NOOP
    };
    const end: ContextInstruction = {
      op: OpCode.NOOP
    };

    this.context.pushCode(start, node.condition);

    await this.exprGenerator.process(node.condition);

    this.context.pushCode(
      {
        op: OpCode.GOTO_A_IF_FALSE,
        goto: end
      },
      node.condition
    );
    mod.pushJumppoint(start, end);

    for (const item of node.body) {
      await this.process(item);
    }

    mod.popJumppoint();
    this.context.pushCode(
      {
        op: OpCode.GOTO_A,
        goto: start
      },
      node.condition
    );
    this.context.pushCode(end, node);
  }

  async processUnaryExpression(node: ASTUnaryExpression): Promise<void> {
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
        this.context.pushCode(
          {
            op: OpCode.FALSIFY,
            command: true
          },
          node
        );
        return;
      }
      case Operator.Minus: {
        await this.exprGenerator.process(arg);
        this.context.pushCode(
          {
            op: OpCode.NEGATE,
            command: true
          },
          node
        );
        return;
      }
      case Operator.New: {
        await this.exprGenerator.process(arg);
        this.context.pushCode(
          {
            op: OpCode.NEW,
            command: true
          },
          node
        );
      }
    }
  }

  async processCallExpression(node: ASTCallExpression): Promise<void> {
    const pushArgs = async () => {
      for (const arg of node.arguments) {
        await this.exprGenerator.process(arg);
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
            length: node.arguments.length,
            command: true
          },
          node.base,
          node.type
        );
      } else {
        await this.exprGenerator.process(base);
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
            length: node.arguments.length,
            command: true
          },
          left.identifier,
          node.type
        );
      }
    } else if (left instanceof ASTIndexExpression) {
      const base = unwrap(left.base);
      if (base instanceof ASTIdentifier && base.name === RuntimeKeyword.Super) {
        await this.exprGenerator.process(left.index);
        await pushArgs();
        this.context.pushCode(
          {
            op: OpCode.CALL_SUPER_PROPERTY,
            length: node.arguments.length,
            command: true
          },
          left.index,
          node.type
        );
      } else {
        await this.exprGenerator.process(base);
        await this.exprGenerator.process(left.index);
        await pushArgs();
        this.context.pushCode(
          {
            op: OpCode.CALL_WITH_CONTEXT,
            length: node.arguments.length,
            command: true
          },
          left.index,
          node.type
        );
      }
    } else if (left instanceof ASTIdentifier) {
      await this.exprGenerator.processIdentifier(left, {
        isDescending: false,
        isReference: true
      });
      await pushArgs();
      this.context.pushCode(
        {
          op: OpCode.CALL,
          length: node.arguments.length,
          command: true
        },
        left,
        node.type
      );
    } else {
      await this.exprGenerator.process(left);
      await pushArgs();
      this.context.pushCode(
        {
          op: OpCode.CALL,
          length: node.arguments.length,
          command: true
        },
        left,
        node.type
      );
    }
  }

  async processIfStatement(node: ASTIfStatement): Promise<void> {
    const end: ContextInstruction = {
      op: OpCode.NOOP
    };

    for (const clause of node.clauses) {
      if (clause instanceof ASTIfClause) {
        const next: ContextInstruction = {
          op: OpCode.NOOP
        };

        await this.exprGenerator.process(clause.condition);
        this.context.pushCode(
          {
            op: OpCode.GOTO_A_IF_FALSE,
            goto: next
          },
          node
        );

        for (const item of clause.body) {
          await this.process(item);
        }

        this.context.pushCode(
          {
            op: OpCode.GOTO_A,
            goto: end
          },
          node
        );
        this.context.pushCode(next, clause);
      } else if (clause instanceof ASTElseClause) {
        for (const item of clause.body) {
          await this.process(item);
        }
      }
    }

    this.context.pushCode(end, node);
  }

  async processForGenericStatement(
    node: ASTForGenericStatement
  ): Promise<void> {
    const mod = this.context.module.peek();
    const variable = node.variable as ASTIdentifier;
    const idxVariable = new CustomString(`__${variable.name}_idx`);
    const start: ContextInstruction = {
      op: OpCode.NEXT,
      idxVariable,
      variable: new CustomString(variable.name)
    };
    const end: ContextInstruction = {
      op: OpCode.POP_ITERATOR
    };

    mod.pushJumppoint(start, end);
    this.context.pushCode(
      {
        op: OpCode.GET_LOCALS
      },
      node
    );
    this.context.pushCode(
      {
        op: OpCode.PUSH,
        value: idxVariable
      },
      node
    );
    this.context.pushCode(
      {
        op: OpCode.PUSH,
        value: new CustomNumber(-1)
      },
      node
    );
    this.context.pushCode(
      {
        op: OpCode.ASSIGN
      },
      node
    );
    await this.exprGenerator.process(node.iterator);
    this.context.pushCode(
      {
        op: OpCode.PUSH_ITERATOR
      },
      node.iterator
    );
    this.context.pushCode(start, node.iterator);
    this.context.pushCode(
      {
        op: OpCode.GOTO_A_IF_FALSE,
        goto: end
      },
      node.iterator
    );

    for (const item of node.body) {
      await this.process(item);
    }

    this.context.pushCode(
      {
        op: OpCode.GOTO_A,
        goto: start
      },
      node.iterator
    );

    this.context.pushCode(end, node.iterator);
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

      this.context.pushInternalCode({
        op: OpCode.GET_LOCALS
      });
      this.context.pushInternalCode({
        op: OpCode.PUSH,
        value: new CustomString('module')
      });
      this.context.pushInternalCode({
        op: OpCode.PUSH,
        value: new CustomString('exports')
      });
      this.context.pushInternalCode({
        op: OpCode.CONSTRUCT_MAP,
        length: 0
      });
      this.context.pushInternalCode({
        op: OpCode.CONSTRUCT_MAP,
        length: 1
      });
      this.context.pushInternalCode({
        op: OpCode.ASSIGN
      });

      await this.process(childNodes);

      this.context.pushInternalCode({
        op: OpCode.GET_VARIABLE,
        property: new CustomString('module')
      });
      this.context.pushInternalCode({
        op: OpCode.PUSH,
        value: new CustomString('exports')
      });
      this.context.pushInternalCode({
        op: OpCode.GET_PROPERTY
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

    this.context.pushCode(
      {
        op: OpCode.GET_LOCALS
      },
      node
    );
    this.context.pushCode(
      {
        op: OpCode.PUSH,
        value: new CustomString((node.name as ASTIdentifier).name)
      },
      node
    );
    this.context.pushCode(
      {
        op: OpCode.IMPORT,
        path: importTarget
      },
      node
    );
    this.context.pushCode(
      {
        op: OpCode.ASSIGN
      },
      node
    );
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
    this.context.pushCode(
      {
        op: OpCode.BREAKPOINT_ENABLE
      },
      node
    );
    this.context.pushCode(
      {
        op: OpCode.BREAKPOINT
      },
      node
    );
  }
}
