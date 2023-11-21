import { CustomValue } from '../types/base';
import { CustomFunctionCallback } from '../types/function';
import { CustomString } from '../types/string';

export enum OpCode {
  NOOP = 'NOOP',
  HALT = 'HALT',
  CALL = 'CALL',
  CALL_INTERNAL = 'CALL_INTERNAL',
  CALL_WITH_CONTEXT = 'CALL_WITH_CONTEXT',
  CONSTRUCT_MAP = 'CONSTRUCT_MAP',
  CONSTRUCT_LIST = 'CONSTRUCT_LIST',
  GET_VARIABLE = 'GET_VARIABLE',
  GET_PROPERTY = 'GET_PROPERTY',
  GET_ENVAR = 'GET_ENVAR',
  GET_SELF = 'GET_SELF',
  GET_OUTER = 'GET_OUTER',
  GET_GLOBALS = 'GET_GLOBALS',
  GET_LOCALS = 'GET_LOCALS',
  GET_SUPER = 'GET_SUPER',
  GET_SUPER_PROPERTY = 'GET_SUPER_PROPERTY',
  CALL_SUPER_PROPERTY = 'CALL_SUPER_PROPERTY',
  FALSIFY = 'FALSIFY',
  NEGATE = 'NEGATE',
  NEW = 'NEW',
  SLICE = 'SLICE',
  ASSIGN = 'ASSIGN',
  PUSH = 'PUSH',
  POP = 'POP',
  ISA = 'ISA',
  ADD = 'ADD',
  SUB = 'SUB',
  MUL = 'MUL',
  DIV = 'DIV',
  MOD = 'MOD',
  POW = 'POW',
  EQUAL = 'EQUAL',
  NOT_EQUAL = 'NOT_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  AND = 'AND',
  OR = 'OR',
  RETURN = 'RETURN',
  FUNCTION_DEFINITION = 'FUNCTION_DEFINITION',
  GOTO_A = 'GOTO_A',
  GOTO_A_IF_FALSE = 'GOTO_IF_FALSE',
  PUSH_ITERATOR = 'PUSH_ITERATOR',
  POP_ITERATOR = 'POP_ITERATOR',
  NEXT = 'NEXT',
  BITWISE_OR = 'BITWISE_OR',
  BITWISE_AND = 'BITWISE_AND',
  BITWISE_LEFT_SHIFT = 'BITWISE_LEFT_SHIFT',
  BITWISE_RIGHT_SHIFT = 'BITWISE_RIGHT_SHIFT',
  BITWISE_UNSIGNED_RIGHT_SHIFT = 'BITWISE_UNSIGNED_RIGHT_SHIFT',
  BREAKPOINT = 'BREAKPOINT',
  BREAKPOINT_ENABLE = 'BREAKPOINT_ENABLE',
  IMPORT = 'IMPORT'
}

export interface FunctionDefinitionInstructionArgument {
  name: CustomString;
  defaultValue: CustomValue;
}

export type SourceLocation = string;

export interface BaseInstruction {
  op: OpCode;
  source: SourceLocation;
  ip?: number;
}

export interface GetVariableInstruction extends BaseInstruction {
  op: OpCode.GET_VARIABLE;
  property: CustomString;
  invoke: boolean;
}

export interface GetPropertyInstruction extends BaseInstruction {
  op: OpCode.GET_PROPERTY | OpCode.GET_SUPER_PROPERTY;
  invoke: boolean;
}

export interface PushInstruction extends BaseInstruction {
  op: OpCode.PUSH;
  value: CustomValue;
}

export interface ConstructMapInstruction extends BaseInstruction {
  op: OpCode.CONSTRUCT_MAP;
  length: number;
}

export interface ConstructListInstruction extends BaseInstruction {
  op: OpCode.CONSTRUCT_LIST;
  length: number;
}

export interface CallInstruction extends BaseInstruction {
  op: OpCode.CALL;
  length: number;
}

export interface CallWithContextInstruction extends BaseInstruction {
  op: OpCode.CALL_WITH_CONTEXT | OpCode.CALL_SUPER_PROPERTY;
  length: number;
}

export interface FunctionDefinitionInstruction extends BaseInstruction {
  op: OpCode.FUNCTION_DEFINITION;
  arguments: FunctionDefinitionInstructionArgument[];
  /* eslint-disable no-use-before-define */
  code: Instruction[];
  ignoreOuter: boolean;
}

export interface GotoAInstruction extends BaseInstruction {
  op: OpCode.GOTO_A | OpCode.GOTO_A_IF_FALSE;
  /* eslint-disable no-use-before-define */
  goto: Instruction;
}

export interface NextInstruction extends BaseInstruction {
  op: OpCode.NEXT;
  /* eslint-disable no-use-before-define */
  goto: Instruction;
  idxVariable: CustomString;
  variable: CustomString;
}

export interface CallInternalInstruction extends BaseInstruction {
  op: OpCode.CALL_INTERNAL;
  callback: CustomFunctionCallback;
  arguments: FunctionDefinitionInstructionArgument[];
}

export interface ImportInstruction extends BaseInstruction {
  op: OpCode.IMPORT;
  path: string;
}

export type Instruction =
  | BaseInstruction
  | GetVariableInstruction
  | PushInstruction
  | ConstructMapInstruction
  | ConstructListInstruction
  | FunctionDefinitionInstruction
  | GotoAInstruction
  | GetPropertyInstruction
  | CallInstruction
  | CallWithContextInstruction
  | NextInstruction
  | CallInternalInstruction
  | ImportInstruction;
