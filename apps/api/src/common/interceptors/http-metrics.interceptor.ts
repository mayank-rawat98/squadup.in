// http-metrics.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Histogram } from 'prom-client';
import { tap } from 'rxjs/operators';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_request_duration_seconds')
    private hist: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const start = process.hrtime();

    return next.handle().pipe(
      tap(() => {
        const delta = process.hrtime(start);
        const seconds = delta[0] + delta[1] / 1e9;
        const route = req.route?.path ?? req.path;
        this.hist
          .labels(
            req.method,
            route,
            String(context.switchToHttp().getResponse().statusCode),
          )
          .observe(seconds);
      }),
    );
  }
}
