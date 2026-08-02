// metrics.providers.ts
import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

export const httpRequestDuration = makeHistogramProvider({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 3],
  labelNames: ['method', 'route', 'status'],
});

export const auditEventsTotal = makeCounterProvider({
  name: 'audit_events_total',
  help: 'Total number of audit events',
  labelNames: ['action', 'status'],
});

export const auditProcessingDuration = makeHistogramProvider({
  name: 'audit_processing_duration',
  help: 'Audit event processing duration in milliseconds',
  buckets: [1, 5, 10, 50, 100, 500, 1000, 5000],
  labelNames: ['action'],
});

export const auditRetriesTotal = makeCounterProvider({
  name: 'audit_retries_total',
  help: 'Total number of audit event retries',
  labelNames: ['action', 'retry_count'],
});

export const auditFailuresTotal = makeCounterProvider({
  name: 'audit_failures_total',
  help: 'Total number of audit events sent to DLQ',
  labelNames: ['action', 'reason'],
});

export const billingPaymentFailuresTotal = makeCounterProvider({
  name: 'billing_payment_failures_total',
  help: 'Total number of failed billing payment events',
  labelNames: ['event'],
});

export const billingSubscriptionLifecycleTotal = makeCounterProvider({
  name: 'billing_subscription_lifecycle_total',
  help: 'Total number of billing subscription lifecycle events',
  labelNames: ['event'],
});

export const billingRefundsIssuedTotal = makeCounterProvider({
  name: 'billing_refunds_issued_total',
  help: 'Total number of billing refunds issued, by currency and kind',
  labelNames: ['currency', 'kind'],
});

export const billingAdminActionsTotal = makeCounterProvider({
  name: 'billing_admin_actions_total',
  help: 'Total number of admin billing actions performed',
  labelNames: ['action'],
});

export const emailsScannedTotal = makeCounterProvider({
  name: 'emails_scanned_total',
  help: 'Total number of emails scanned by the abuse pipeline',
  labelNames: ['direction', 'verdict'],
});

export const emailsBlockedTotal = makeCounterProvider({
  name: 'emails_blocked_total',
  help: 'Total number of emails blocked by security enforcement',
  labelNames: ['direction'],
});

export const emailsQuarantinedTotal = makeCounterProvider({
  name: 'emails_quarantined_total',
  help: 'Total number of emails quarantined by security enforcement',
  labelNames: ['direction'],
});

export const encryptionDecryptFailuresTotal = makeCounterProvider({
  name: 'encryption_decrypt_failures_total',
  help: 'Total number of email decryption failures',
  labelNames: ['entity'],
});

export const highRiskUsersTotal = makeCounterProvider({
  name: 'high_risk_users_total',
  help: 'Total number of high risk user evaluations',
  labelNames: ['level'],
});

export const highRiskDomainsTotal = makeCounterProvider({
  name: 'high_risk_domains_total',
  help: 'Total number of high risk domain evaluations',
  labelNames: ['level'],
});

export const billingRevenueTotal = makeCounterProvider({
  name: 'billing_revenue_total',
  help: 'Total revenue collected in minor currency units, by currency and plan',
  labelNames: ['currency', 'plan'],
});

export const billingRefundFailuresTotal = makeCounterProvider({
  name: 'billing_refund_failures_total',
  help: 'Total number of refund gateway failures',
  labelNames: ['reason'],
});

export const billingCheckoutAbandonedTotal = makeCounterProvider({
  name: 'billing_checkout_abandoned_total',
  help: 'Total number of abandoned upgrade checkout invoices voided',
  labelNames: ['kind'],
});

export const billingDunningExhaustedTotal = makeCounterProvider({
  name: 'billing_dunning_exhausted_total',
  help: 'Total number of subscriptions where dunning was fully exhausted',
  labelNames: ['failure_category'],
});
