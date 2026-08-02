import { ConfigService } from '@nestjs/config';
const configService = new ConfigService();

/**
 * Validates and retrieves a required environment variable
 * Throws an error if the variable is not set
 */
function getRequiredEnv(key: string): string {
  const value = configService.get<string>(key);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Please check your .env file.`,
    );
  }
  return value;
}

/**
 * Validates and retrieves a required number environment variable with default
 * Throws an error if the variable is set but invalid
 */
function getNumberEnv(key: string, defaultValue: number): number {
  const value = configService.get<string>(key);
  if (!value) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Invalid number value for environment variable: ${key}=${value}`,
    );
  }
  return parsed;
}

export const clientUrl = getRequiredEnv('CLIENT_URL');
// Ops dashboard runs on its own origin (e.g. https://ops.squadup.in).
export const opsUrl = getRequiredEnv('OPS_URL');
// Single source of truth for every CORS context (REST, Socket.IO gateways, CSP).
export const allowedOrigins = [clientUrl, opsUrl];
// WebAuthn / passkeys relying party. RP_ID must be a registrable suffix of the
// web origin (apex `squadup.in` in prod, `localhost` in dev). Passkeys are a
// web-customer-only feature — ops staff have a separate identity with no 2FA.
export const rpId = configService.get<string>('RP_ID') || 'localhost';
export const rpName = configService.get<string>('RP_NAME') || 'Squadup';
// The single browser origin allowed to perform passkey ceremonies.
export const passkeyExpectedOrigin = clientUrl;
const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
export const isProduction = nodeEnv === 'production';
export const apiPort = configService.get<number>('API_PORT') || 8080;
export const SWAGGER_USER =
  configService.get<string>('SWAGGER_USER') || 'admin';
export const SWAGGER_PASSWORD =
  configService.get<string>('SWAGGER_PASSWORD') || 'admin';
export const RabbitmqConfig = {
  url: getRequiredEnv('RABBITMQ_URL'),
  queue: getRequiredEnv('RABBITMQ_QUEUE_AUDIT_LOGS'),
  exchange: getRequiredEnv('RABBITMQ_EXCHANGE_AUDIT'),
  dlxExchange: getRequiredEnv('RABBITMQ_DLX_EXCHANGE'),
  dlqQueue: getRequiredEnv('RABBITMQ_DLQ_QUEUE'),
  prefetchCount: getNumberEnv('RABBITMQ_PREFETCH_COUNT', 10),
  retryAttempts: getNumberEnv('RABBITMQ_RETRY_ATTEMPTS', 3),
  retryDelay: getNumberEnv('RABBITMQ_RETRY_DELAY', 5000),
};

export const mongoUri = getRequiredEnv('MONGO_URI');

export * from './rabbitmq.config';
