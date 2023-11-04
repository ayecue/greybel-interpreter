import { ObjectValue } from '../utils/object-value';

export type ContextTypeIntrinsics = {
  map: ObjectValue;
  list: ObjectValue;
  number: ObjectValue;
  string: ObjectValue;
  function: ObjectValue;
};
