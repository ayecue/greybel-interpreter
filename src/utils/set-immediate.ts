function setImmediateProvider(): (
  callback: (...args: any[]) => void,
  ...args: any[]
) => any {
  const ctx = globalThis as any;
  return (
    ctx.setImmediate ??
    ctx.requestAnimationFrame ??
    function (callback, ...args) {
      return setTimeout(() => callback(...args), 0);
    }
  );
}

export const setImmediate = setImmediateProvider();
