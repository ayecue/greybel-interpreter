import {
  ASTBase,
  ASTBooleanLiteral,
  ASTLiteral,
  ASTNumericLiteral,
  ASTParenthesisExpression,
  ASTType
} from 'miniscript-core';

import { CustomBoolean } from '../types/boolean';
import { DefaultType } from '../types/default';
import { CustomNumber } from '../types/number';
import { CustomString } from '../types/string';

export function generateCustomValueFromASTLiteral(node: ASTLiteral) {
  switch (node.type) {
    case ASTType.BooleanLiteral: {
      const booleanLiteralNode = node as ASTBooleanLiteral;
      return new CustomBoolean(
        booleanLiteralNode.negated
          ? -booleanLiteralNode.value
          : booleanLiteralNode.value
      );
    }
    case ASTType.StringLiteral:
      return new CustomString(node.value as string);
    case ASTType.NumericLiteral: {
      const numericLiteralNode = node as ASTNumericLiteral;
      return new CustomNumber(
        numericLiteralNode.negated
          ? -numericLiteralNode.value
          : numericLiteralNode.value
      );
    }
    case ASTType.NilLiteral:
      return DefaultType.Void;
    default:
      throw new Error('Unexpected literal type.');
  }
}

export function unwrap(node: ASTBase) {
  while (node instanceof ASTParenthesisExpression) {
    node = node.expression;
  }
  return node;
}
