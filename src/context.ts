import { ASTBase } from 'miniscript-core';

import { CustomValue } from './types/base';
import { CustomMap } from './types/map';
import { ObjectValue } from './utils/object-value';
import { ContextTypeIntrinsics } from './context/types';
import { Instruction } from './bytecode-generator/instruction';
import { Self, Super } from './types/string';
import { CustomValueWithIntrinsicsResult } from './types/with-intrinsics';
import { Stack } from './utils/stack';

export enum ContextType {
  Api,
  Global,
  Function,
  Injected
}

export interface ContextOptions {
  code: Instruction[];
  /* eslint-disable no-use-before-define */
  previous?: OperationContext;
  type?: ContextType;
  self?: CustomValue;
  super?: CustomValue;
  isProtected?: boolean;
  isCalledByCommand?: boolean;
  /* eslint-disable no-use-before-define */
  outer?: OperationContext;
}

export interface ContextForkOptions {
  code: Instruction[];
  type: ContextType;
  self?: CustomValue;
  super?: CustomValue;
  target?: string;
  isCalledByCommand?: boolean;
  /* eslint-disable no-use-before-define */
  outer?: OperationContext;
}

export class OperationContext {
  /* eslint-disable no-use-before-define */
  previous: OperationContext;
  iterators: Stack<Iterator<CustomValue> & { index: number }>;

  readonly type: ContextType;
  readonly scope: CustomMap;

  isProtected: boolean;
  isCalledByCommand: boolean;
  injected: boolean;

  cp: null | number;
  ip: number;
  code: Instruction[];

  self: CustomValue | null;
  super: CustomValue | null;

  /* eslint-disable no-use-before-define */
  readonly api: OperationContext;
  /* eslint-disable no-use-before-define */
  readonly locals: OperationContext;
  /* eslint-disable no-use-before-define */
  readonly outer: OperationContext;
  /* eslint-disable no-use-before-define */
  readonly globals: OperationContext;

  private static readonly lookupApiType: Set<ContextType> = new Set([ContextType.Api]);
  private static readonly lookupGlobalsType: Set<ContextType> = new Set([
    ContextType.Global
  ]);

  private static readonly lookupLocalsType: Set<ContextType> = new Set([
    ContextType.Global,
    ContextType.Function
  ]);

  constructor(options: ContextOptions) {
    this.iterators = new Stack();
    this.code = options.code;
    this.cp = null;
    this.ip = 0;
    this.previous = options.previous ?? null;
    this.type = options.type ?? ContextType.Api;
    this.scope = this.type === ContextType.Injected ? options.previous.scope : new CustomMap();
    this.self = options.self ?? null;
    this.super = options.super ?? null;
    this.isProtected = options.isProtected ?? false;
    this.isCalledByCommand = options.isCalledByCommand ?? false;

    this.api = this.previous?.api ?? this.lookupApi();
    this.globals = this.previous?.globals ?? this.lookupGlobals();
    this.locals = this.lookupLocals() ?? this;
    this.outer = options.outer ?? this.lookupOuter();
  }

  lookupAllOfType(
    validate: (type: ContextType) => boolean
  ): OperationContext[] {
    const me = this;
    const result = [];

    if (validate(me.type)) {
      result.push(me);
    }

    let current = me.previous;

    while (current) {
      if (validate(current.type)) {
        result.push(current);
      }

      current = current.previous;
    }

    return result;
  }

  lookupType(allowedTypes: Set<ContextType>): OperationContext {
    if (allowedTypes.has(this.type)) {
      return this;
    }

    let current = this.previous;

    while (current !== null) {
      if (allowedTypes.has(current.type)) {
        return current;
      }

      current = current.previous;
    }

    return null;
  }

  lookupAllScopes(): OperationContext[] {
    return this.lookupAllOfType((type: ContextType) =>
      [ContextType.Global, ContextType.Function].includes(type)
    );
  }

  lookupApi(): OperationContext {
    return this.lookupType(OperationContext.lookupApiType);
  }

  lookupGlobals(): OperationContext {
    return this.lookupType(OperationContext.lookupGlobalsType);
  }

  lookupLocals(): OperationContext {
    return this.lookupType(OperationContext.lookupLocalsType);
  }

  lookupOuter(): OperationContext {
    return this.locals.previous?.lookupLocals() ?? null;
  }

  extend(map: ObjectValue): OperationContext {
    this.scope.extend(map);
    return this;
  }

  set(path: CustomValue, value: CustomValue) {
    this.locals.scope.set(path, value);
  }

  get(path: CustomValue, contextTypeIntrinsics: ContextTypeIntrinsics): CustomValue {
    return this.locals.scope.get(path, contextTypeIntrinsics);
  }

  getNamespace(path: CustomValue): CustomValue {
    if (this.locals.scope.value.has(path)) {
      return this.locals.scope.value.get(path);
    } else if (this.outer?.scope.value.has(path)) {
      return this.outer.scope.value.get(path);
    } else if (this.globals?.scope.value.has(path)) {
      return this.globals.scope.value.get(path);
    } else if (this.api?.scope.value.has(path)) {
      return this.api.scope.value.get(path);
    }

    throw new Error(`Path "${path.toString()}" not found in scope.`);
  }

  injectContext() {
    if (this.self) this.set(Self, this.self);
    if (this.super) this.set(Super, this.super);
  }

  getCurrentInstruction(): Instruction | null {
    if (this.cp === null) return null;
    return this.code[this.cp];
  }

  fork(options: ContextForkOptions): OperationContext {
    return new OperationContext({
      previous: this,
      type: options.type,
      isProtected: false,
      code: options.code,
      self: options.self,
      super: options.super,
      outer: options.outer,
      isCalledByCommand: options.isCalledByCommand
    });
  }
}
