export const setImmediate: (
  callback: (...args: any[]) => void,
  ...args: any[]
) => any =
  globalThis.setImmediate ??
  function (callback: (...args: any[]) => void, ...args: any[]) {
    return setTimeout(() => callback(...args), 0);
  };
