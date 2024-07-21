type Callback = () => void;

const next = globalThis.queueMicrotask ?? globalThis?.process?.nextTick ?? function (callback: Callback) {
  try { callback(); } catch (err) { console.error(`Error while executing callback`, err); }
};

class ScheduleHelper {
  static SLEEP_LIMIT = 1000 as const;
  static QUEUE_LIMIT = 1024 as const;

  static createCallback(): (cb: Callback) => void {
    const helper = new ScheduleHelper();
    return helper.add.bind(helper);
  }

  private queue: (() => void)[] = [];
  private sleep: number = 0;
  private timer: NodeJS.Timeout | null = null;
  private boundTick: () => void = this.tick.bind(this);

  private shouldStop() {
    if (this.queue.length > 0) this.sleep = 0;
    if (this.sleep++ <= ScheduleHelper.SLEEP_LIMIT) return;
    clearInterval(this.timer);
    this.timer = null;
  };

  private tick() {
    const q = this.queue;
    const m = Math.min(q.length, ScheduleHelper.QUEUE_LIMIT);
    this.queue = this.queue.slice(ScheduleHelper.QUEUE_LIMIT);
    for (let i = 0; i < m; i++) next(q[i]);
    this.shouldStop();
  };

  private start() {
    if (this.timer !== null) return;
    this.sleep = 0;
    this.timer = setInterval(this.boundTick, 0);
  };

  add(callback: Callback) {
    this.queue.push(callback);
    this.start();
  };
}

export const schedule = ScheduleHelper.createCallback();
