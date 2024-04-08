import {
  ASTFeatureEnvarExpression,
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression
} from 'greybel-core';
import {
  ASTAssignmentStatement,
  ASTBase,
  ASTCallExpression,
  ASTEvaluationExpression,
  ASTForGenericStatement,
  ASTFunctionStatement,
  ASTIdentifier,
  ASTIfStatement,
  ASTIndexExpression,
  ASTListConstructorExpression,
  ASTLiteral,
  ASTMapConstructorExpression,
  ASTMemberExpression,
  ASTReturnStatement,
  ASTSliceExpression,
  ASTUnaryExpression,
  ASTWhileStatement
} from 'miniscript-core';

import {
  LineCallableContext,
  LineContext,
  LineIdentifierContext
} from './line';

export interface ParseCodeFunction {
  (code: string): ASTBase;
}

export interface IBytecodeStatementGenerator {
  process(node: ASTBase): Promise<void>;
  processMemberExpression(
    node: ASTMemberExpression,
    context?: LineCallableContext
  ): Promise<void>;
  processIndexExpression(
    node: ASTIndexExpression,
    context?: LineCallableContext
  ): Promise<void>;
  processIdentifier(
    node: ASTIdentifier,
    context?: LineIdentifierContext
  ): Promise<void>;
  processAssignmentStatement(node: ASTAssignmentStatement): Promise<void>;
  processEvaluationExpression(node: ASTEvaluationExpression): Promise<void>;
  processReturn(node: ASTReturnStatement): Promise<void>;
  processBreak(node: ASTBase): Promise<void>;
  processContinue(node: ASTBase): Promise<void>;
  processMapConstructorExpression(
    node: ASTMapConstructorExpression
  ): Promise<void>;
  processListConstructorExpression(
    node: ASTListConstructorExpression
  ): Promise<void>;
  processWhileStatement(node: ASTWhileStatement): Promise<void>;
  processUnaryExpression(node: ASTUnaryExpression): Promise<void>;
  processCallExpression(node: ASTCallExpression): Promise<void>;
  processIfStatement(node: ASTIfStatement): Promise<void>;
  processForGenericStatement(node: ASTForGenericStatement): Promise<void>;
  processImportExpression(node: ASTFeatureImportExpression): Promise<void>;
  processIncludeExpression(node: ASTFeatureIncludeExpression): Promise<void>;
  processDebuggerExpression(node: ASTBase): Promise<void>;
}

export interface IBytecodeExpressionGenerator {
  process(node: ASTBase, context?: LineContext): Promise<void>;
  processMemberExpression(
    node: ASTMemberExpression,
    context?: LineCallableContext
  ): Promise<void>;
  processIndexExpression(node: ASTIndexExpression): Promise<void>;
  processSliceExpression(node: ASTSliceExpression): Promise<void>;
  processIdentifier(
    node: ASTIdentifier,
    context?: LineIdentifierContext
  ): Promise<void>;
  processLiteral(node: ASTLiteral): Promise<void>;
  processEvaluationExpression(node: ASTEvaluationExpression): Promise<void>;
  processMapConstructorExpression(
    node: ASTMapConstructorExpression
  ): Promise<void>;
  processListConstructorExpression(
    node: ASTListConstructorExpression
  ): Promise<void>;
  processFunctionDeclaration(
    node: ASTFunctionStatement,
    context?: LineContext
  ): Promise<void>;
  processUnaryExpression(node: ASTUnaryExpression): Promise<void>;
  processCallExpression(node: ASTCallExpression): Promise<void>;
  processEnvarExpression(node: ASTFeatureEnvarExpression): Promise<void>;
}
