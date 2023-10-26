import { setImmediate } from './set-immediate';

export const nextTick = (): Promise<void> => {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
};
