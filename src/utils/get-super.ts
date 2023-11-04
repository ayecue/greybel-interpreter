import { CustomValue } from '../types/base';
import { CustomMap } from '../types/map';

export function getSuper(item: CustomValue): CustomMap {
  if (item instanceof CustomMap) {
    return item.getIsa() ?? new CustomMap();
  }
  return null;
}
