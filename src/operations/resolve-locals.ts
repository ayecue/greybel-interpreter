import { OperationContext } from '../context';
import { Resolve, ResolveResult } from './resolve';

export class ResolveLocals extends Resolve {
  async getResult(ctx: OperationContext): Promise<ResolveResult | null> {
    return super.getResult(ctx, ctx.locals.scope);
  }
}
