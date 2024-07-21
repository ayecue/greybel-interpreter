class RunNextHelper {
  static SLEEP_LIMIT = 1000 as const;

  private stack: Function[] = [];
  private sleep: number = 0;
  private timer: NodeJS.Timeout | null = null;

  private shouldSleep() {
    if (this.stack.length > 0) return this.sleep = 0;
    if (this.sleep++ <= RunNextHelper.SLEEP_LIMIT) return;
    clearInterval(this.timer);
    this.timer = null;
  };

  private tick() {
    const current = this.stack;
    this.stack = [];
    for (let i = 0; i < current.length; i++) {
      try { current[i](); } catch (err) { }
    }
    this.shouldSleep();
  };

  private start() {
    if (this.timer !== null) return;
    this.sleep = 0;
    this.timer = setInterval(() => this.tick(), 0);
  };

  add(callback: Function) {
    this.stack.push(callback);
    this.start();
  };
}

const helper = new RunNextHelper();
export const runNext = helper.add.bind(helper);
