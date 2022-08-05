export default class Path<T> {
  readonly path: Array<T>;

  constructor(path: Array<T> = []) {
    this.path = [...path];
  }

  next(): T | null {
    if (this.path.length === 0) {
      return null;
    }

    return this.path.shift();
  }

  last(): T | null {
    if (this.path.length === 0) {
      return null;
    }

    return this.path.pop();
  }

  add(value: T) {
    this.path.push(value);
  }

  toString(): string {
    return this.path.join('.');
  }

  count(): number {
    return this.path.length;
  }

  clone(): Path<T> {
    return new Path<T>(this.path);
  }
}
