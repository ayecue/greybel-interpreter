export interface LineContext {
  includeOuter?: boolean;
  isStatement?: boolean;
}

export interface LineCallableContext extends LineContext {
  isReference?: boolean;
}

export interface LineIdentifierContext extends LineCallableContext {
  isDescending?: boolean;
}
