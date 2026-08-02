import {
  BadRequestException,
  Logger,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError, useContainer } from 'class-validator';
import helmet from 'helmet';
import basicAuth from 'express-basic-auth';
import * as os from 'os';
import { AppModule } from './app.module';
import {
  apiPort,
  getMicroserviceConfig,
  getDLQMicroserviceConfig,
  getInvoicePdfMicroserviceConfig,
  SWAGGER_USER,
  SWAGGER_PASSWORD,
} from './config';
import { CORS_CONFIG, HELMET_CONFIG } from './config/config.constants';
import { HttpExceptionFilter } from './filters/exception.filter';
import { ValidationException } from './filters/validation.filter';
import { MicroserviceOptions } from '@nestjs/microservices';
import { SWAGGER_ENDPOINTS } from './constants/constants';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  const hostname = os.hostname();

  // Trust exactly one reverse proxy (nginx) so req.ip is derived from
  // X-Forwarded-For instead of the proxy's address. Without this every
  // request would share the same rate-limit bucket and a single blocked
  // IP would block the entire service.
  app.set('trust proxy', 1);

  // Enable WebSocket support for real-time notifications
  app.useWebSocketAdapter(new IoAdapter(app));
  app.use(helmet(HELMET_CONFIG));
  app.use(cookieParser());
  app.enableCors(CORS_CONFIG);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
      skipMissingProperties: false,
      skipUndefinedProperties: false,
      transformOptions: { enableImplicitConversion: false },
      exceptionFactory: (errors: ValidationError[]) => {
        return new ValidationException(errors);
      },
    }),
  );
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
  });

  // Connect main audit queue microservice
  app.connectMicroservice<MicroserviceOptions>(getMicroserviceConfig());

  // Connect Dead Letter Queue microservice (separate consumer group)
  // This allows DLQ processing to be independent of main queue
  app.connectMicroservice<MicroserviceOptions>(getDLQMicroserviceConfig());

  // Connect invoice PDF generation queue
  app.connectMicroservice<MicroserviceOptions>(
    getInvoicePdfMicroserviceConfig(),
  );

  // Start all microservices
  await app.startAllMicroservices();

  app.use(
    SWAGGER_ENDPOINTS,
    basicAuth({
      challenge: true,
      users: { [SWAGGER_USER]: SWAGGER_PASSWORD },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SquadUp API')
    .setDescription(
      'REST API for SquadUp — Collaborative Platform.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
  if (!apiPort) {
    throw new BadRequestException(
      'API_PORT is not defined in environment variables',
    );
  }
  await app.listen(apiPort);
  Logger.log(`🚀 Application is running on: ${hostname}:${apiPort}`);
}
bootstrap().catch((err) => {
  // Log the error and exit the process with a non-zero code to indicate failure
  Logger.error('Failed to start application', err);
  process.exit(1);
});
