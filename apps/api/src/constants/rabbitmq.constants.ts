export const RABBITMQ_CONSTANTS = {
  // Exchanges
  EXCHANGES: {
    AUDIT: 'audit_exchange',
    AUDIT_DLX: 'audit_dlx_exchange',
  },

  // Queues
  QUEUES: {
    AUDIT_LOGS: 'audit_logs_queue',
    AUDIT_RETRY: 'audit_retry_queue', // Temporary queue for delayed retries
    AUDIT_DLQ: 'audit_dlq_queue', // Dead Letter Queue
    INVOICE_PDF: 'invoice_pdf_queue_v2',
    INVOICE_PDF_DLQ: 'invoice_pdf_dlq_queue_v2',
  },

  INVOICE_PDF: {
    ROUTING_KEY: 'invoice_pdf_queue_v2',
  },

  // Routing Keys
  ROUTING_KEYS: {
    AUDIT_CREATE: 'audit.create',
    AUDIT_EMAIL_SENT: 'audit.email.sent',
    AUDIT_EMAIL_BOUNCED: 'audit.email.bounced',
    AUDIT_USER_ACTION: 'audit.user.action',
    AUDIT_CAMPAIGN: 'audit.campaign',
    AUDIT_SYSTEM: 'audit.system',
  },

  // Message Patterns
  PATTERNS: {
    AUDIT_LOG_CREATE: 'audit.log.create',
  },

  // Options
  OPTIONS: {
    DURABLE: true,
    PREFETCH_COUNT: 10,
    NO_ACK: false,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 5000, // 5 seconds (base delay)
    MESSAGE_TTL: 86400000, // 24 hours in milliseconds
    // Exponential backoff delays (in milliseconds)
    RETRY_DELAYS: {
      1: 5000, // 5 seconds for first retry
      2: 15000, // 15 seconds for second retry
      3: 45000, // 45 seconds for third retry
    },
  },
} as const;
