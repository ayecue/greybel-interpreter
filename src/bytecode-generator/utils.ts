import {
  ASTBase,
  ASTLiteral,
  ASTParenthesisExpression,
  ASTType
} from 'miniscript-core';

import { CustomBoolean } from '../types/boolean';
import { DefaultType } from '../types/default';
import { CustomNumber } from '../types/number';
import { CustomString } from '../types/string';

export function generateCustomValueFromASTLiteral(node: ASTLiteral) {
  switch (node.type) {
    case ASTType.BooleanLiteral:
      return new CustomBoolean(node.value as boolean);
    case ASTType.StringLiteral:
      return new CustomString(node.value as string);
    case ASTType.NumericLiteral:
      return new CustomNumber(node.value as number);
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
