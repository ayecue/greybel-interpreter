export interface LineContext {
  includeOuter?: boolean;
}

export interface LineCallableContext extends LineContext {
  isReference?: boolean;
}

export interface LineIdentifierContext extends LineCallableContext {
  isDescending?: boolean;
}
