import { ASTMemberExpression } from 'greyscript-core';

export function lookupPath(item: ASTMemberExpression): ASTMemberExpression[] {
  const path: ASTMemberExpression[] = [item];
  let current = item.base;

  while (current instanceof ASTMemberExpression) {
    path.unshift(current);
    current = current.base;
  }

  return path;
}
