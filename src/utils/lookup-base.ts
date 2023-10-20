import { ASTBase, ASTMemberExpression } from "greyscript-core";

export function lookupPath(item: ASTMemberExpression): ASTBase[] {
  const path: ASTBase[] = [item];
  let current = item.base;

  while (current != null) {
    path.unshift(current);

    if (current instanceof ASTMemberExpression) {
      current = current.base;
    } else {
      break;
    }
  }

  return path;
}