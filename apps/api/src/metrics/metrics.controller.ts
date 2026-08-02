// metrics.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { register } from 'prom-client';
import { SkipThrottle } from '../decorators/throttler.decorator';

// collectDefaultMetrics(); // optional, run once (or via module)

@SkipThrottle()
@Controller({
  path: 'metrics',
  version: '1',
})
export class MetricsController {
  @Get()
  async metrics(@Res() res: Response) {
    res.set('Content-Type', register.contentType); // typically 'text/plain; version=0.0.4'
    res.send(await register.metrics());
  }
}
