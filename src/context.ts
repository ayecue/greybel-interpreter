import { ASTBase } from 'miniscript-core';

import { CustomValue } from './types/base';
import { CustomMap } from './types/map';
import { ObjectValue } from './utils/object-value';
import { ContextTypeIntrinsics } from './context/types';
import { Instruction } from './byte-compiler/instruction';
import { Self, Super } from './types/string';
import { CustomValueWithIntrinsicsResult } from './types/with-intrinsics';
import { Stack } from './utils/stack';

export enum ContextType {
  Api,
  Global,
  Function,
  Injected
}

export class Scope extends CustomMap {
  /* eslint-disable no-use-before-define */
  private readonly context: OperationContext;

  constructor(context: OperationContext) {
    super();
    this.context = context;
  }

  get(current: CustomValue, typeIntrinsics: ContextTypeIntrinsics): CustomValue {
    if (this.has(current)) {
      return super.get(current, typeIntrinsics);
    } else if (this.context.outer?.scope.has(current)) {
      return this.context.outer.scope.get(current, typeIntrinsics);
    } else if (this.context.globals?.scope.has(current)) {
      return this.context.globals.scope.get(current, typeIntrinsics);
    } else if (this.context.api?.scope.has(current)) {
      return this.context.api.scope.get(current, typeIntrinsics);
    }

    const intrinsics = typeIntrinsics.map ?? CustomMap.getIntrinsics();

    if (intrinsics.has(current)) {
      return intrinsics.get(current);
    }

    throw new Error(`Unknown path ${current.toString()}.`);
  }

  getWithOrigin(current: CustomValue, typeIntrinsics: ContextTypeIntrinsics): CustomValueWithIntrinsicsResult {
    if (this.has(current)) {
      return super.getWithOrigin(current, typeIntrinsics);
    } else if (this.context.outer?.scope.has(current)) {
      return this.context.outer.scope.getWithOrigin(current, typeIntrinsics);
    } else if (this.context.globals?.scope.has(current)) {
      return this.context.globals.scope.getWithOrigin(current, typeIntrinsics);
    } else if (this.context.api?.scope.has(current)) {
      return this.context.api.scope.getWithOrigin(current, typeIntrinsics);
    }

    const intrinsics = typeIntrinsics.map ?? CustomMap.getIntrinsics();

    if (intrinsics.has(current)) {
      return {
        value: intrinsics.get(current),
        origin: null
      };
    }

    throw new Error(`Unknown path ${current.toString()}.`);
  }
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
  readonly scope: Scope;

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

  private static readonly lookupApiType: Array<ContextType> = [ContextType.Api];
  private static readonly lookupGlobalsType: Array<ContextType> = [
    ContextType.Global
  ];

  private static readonly lookupLocalsType: Array<ContextType> = [
    ContextType.Global,
    ContextType.Function
  ];

  constructor(options: ContextOptions) {
    this.iterators = new Stack();
    this.code = options.code;
    this.cp = null;
    this.ip = 0;
    this.previous = options.previous ?? null;
    this.type = options.type ?? ContextType.Api;
    this.scope = this.type === ContextType.Injected ? options.previous.scope : new Scope(this);
    this.self = options.self ?? null;
    this.super = options.super ?? null;
    this.isProtected = options.isProtected ?? false;
    this.isCalledByCommand = options.isCalledByCommand ?? false;

    this.api = this.lookupApi();
    this.globals = this.lookupGlobals();
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

  lookupType(allowedTypes: Array<ContextType>): OperationContext {
    if (allowedTypes.includes(this.type)) {
      return this;
    }

    let current = this.previous;

    while (current !== null) {
      if (allowedTypes.includes(current.type)) {
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
