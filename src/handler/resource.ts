import fs from 'fs';
import path from 'path';

export abstract class ResourceHandler {
  abstract getTargetRelativeTo(source: string, target: string): Promise<string>;
  abstract has(target: string): Promise<boolean>;
  abstract get(target: string): Promise<string>;
  abstract resolve(target: string): Promise<string>;
}

export class DefaultResourceHandler extends ResourceHandler {
  getTargetRelativeTo(source: string, target: string): Promise<string> {
    const base = path.resolve(source, '..');
    const result = path.resolve(base, target);
    return Promise.resolve(fs.existsSync(result) ? result : result + '.src');
  }

  has(target: string): Promise<boolean> {
    return Promise.resolve(fs.existsSync(target));
  }

  get(target: string): Promise<string> {
    return Promise.resolve(fs.readFileSync(target, 'utf8'));
  }

  resolve(target: string): Promise<string> {
    return Promise.resolve(path.resolve(target));
  }
}
