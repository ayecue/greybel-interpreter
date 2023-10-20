import { OperationContext } from '../context';
import { Resolve, ResolveResult } from './resolve';

export class ResolveSelf extends Resolve {
  async getResult(ctx: OperationContext): Promise<ResolveResult | null> {
    return super.getResult(ctx, ctx.functionState.context);
  }
}
