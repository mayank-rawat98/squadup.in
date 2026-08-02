import { Logger, type FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

export const RedisProvider: FactoryProvider = {
  provide: 'REDIS_CLIENT',
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const logger = new Logger('RedisProvider');
    const username = configService.get<string>('REDIS_USERNAME');
    const password = configService.get<string>('REDIS_PASSWORD');

    const client = createClient({
      ...(username && { username }),
      ...(password && { password }),
      socket: {
        host: configService.get<string>('REDIS_HOST', 'redis'),
        port: configService.get<number>('REDIS_PORT', 6379),
        connectTimeout: 10000,
        reconnectStrategy: (retries) => Math.min(retries * 500, 5000),
      },
    });

    client.on('error', (err) => logger.error('❌ Redis Client Error:', err));
    client.on('connect', () => logger.log('🔌 Redis connecting...'));
    client.on('ready', () => logger.log('✅ Redis connected successfully'));

    if (!client.isOpen) {
      await client.connect();
    }

    return client;
  },
};
