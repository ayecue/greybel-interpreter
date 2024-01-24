import { Stack } from './stack';

export class LimitedStack<T> extends Stack<T> {
  private limit: number;

  constructor(limit: number, value?: T) {
    super(value);
    this.limit = limit;
  }

  push(value: T): number {
    if (this.length >= this.limit) {
      throw new Error('Exceeded stack limit!');
    }
    return super.push(value);
  }
}
