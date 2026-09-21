// Provide the minimum environment variables required by src/config/index.ts
// so that test suites can import application modules without throwing.
// These values are intentionally dummy strings — no real services are needed
// because every test file mocks its own dependencies.
process.env.CLIENT_URL ??= 'http://localhost:3000';
process.env.OPS_URL ??= 'http://localhost:3001';
process.env.RABBITMQ_URL ??= 'amqp://guest:guest@localhost:5672';
process.env.RABBITMQ_QUEUE_AUDIT_LOGS ??= 'audit_logs';
process.env.RABBITMQ_EXCHANGE_AUDIT ??= 'audit_exchange';
process.env.RABBITMQ_DLX_EXCHANGE ??= 'audit_dlx_exchange';
process.env.RABBITMQ_DLQ_QUEUE ??= 'audit_dlq';
process.env.MONGO_URI ??= 'mongodb://localhost:27017/squadup_test';
