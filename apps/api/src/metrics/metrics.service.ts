import { Injectable } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('audit_events_total')
    public auditEventsCounter: Counter<string>,

    @InjectMetric('audit_processing_duration')
    public processingDuration: Histogram<string>,

    @InjectMetric('audit_retries_total')
    public auditRetriesCounter: Counter<string>,

    @InjectMetric('audit_failures_total')
    public auditFailuresCounter: Counter<string>,

    @InjectMetric('billing_payment_failures_total')
    public billingPaymentFailuresCounter: Counter<string>,

    @InjectMetric('billing_subscription_lifecycle_total')
    public billingSubscriptionLifecycleCounter: Counter<string>,

    @InjectMetric('billing_refunds_issued_total')
    public billingRefundsIssuedCounter: Counter<string>,

    @InjectMetric('billing_admin_actions_total')
    public billingAdminActionsCounter: Counter<string>,

    @InjectMetric('billing_revenue_total')
    public billingRevenueCounter: Counter<string>,

    @InjectMetric('billing_refund_failures_total')
    public billingRefundFailuresCounter: Counter<string>,

    @InjectMetric('billing_checkout_abandoned_total')
    public billingCheckoutAbandonedCounter: Counter<string>,

    @InjectMetric('billing_dunning_exhausted_total')
    public billingDunningExhaustedCounter: Counter<string>,

    @InjectMetric('emails_scanned_total')
    public emailsScannedCounter: Counter<string>,

    @InjectMetric('emails_blocked_total')
    public emailsBlockedCounter: Counter<string>,

    @InjectMetric('emails_quarantined_total')
    public emailsQuarantinedCounter: Counter<string>,

    @InjectMetric('encryption_decrypt_failures_total')
    public emailDecryptFailuresCounter: Counter<string>,

    @InjectMetric('high_risk_users_total')
    public highRiskUsersCounter: Counter<string>,

    @InjectMetric('high_risk_domains_total')
    public highRiskDomainsCounter: Counter<string>,
  ) {}

  /**
   * Increment audit event counter
   * @param action The audit action type
   * @param status Status of the event (success, retry, failure)
   */
  incrementAuditEvent(
    action: string,
    status: 'success' | 'retry' | 'failure' = 'success',
  ) {
    this.auditEventsCounter.inc({ action, status });
  }

  /**
   * Record audit processing time
   * @param duration Duration in milliseconds
   * @param action The audit action type
   */
  recordProcessingTime(duration: number, action?: string) {
    // Convert milliseconds to seconds for Prometheus convention
    const durationInSeconds = duration / 1000;
    this.processingDuration.observe(
      { action: action || 'unknown' },
      durationInSeconds,
    );
  }

  /**
   * Track retry attempts
   * @param action The audit action type
   * @param retryCount Current retry count
   */
  incrementRetry(action: string, retryCount: number) {
    this.auditRetriesCounter.inc({
      action,
      retry_count: retryCount.toString(),
    });
  }

  /**
   * Track failures sent to DLQ
   * @param action The audit action type
   * @param reason Reason for failure
   */
  incrementFailure(action: string, reason = 'max_retries_exceeded') {
    this.auditFailuresCounter.inc({ action, reason });
  }

  incrementPaymentFailure(event: string) {
    this.billingPaymentFailuresCounter.inc({ event });
  }

  incrementSubscriptionLifecycle(event: string) {
    this.billingSubscriptionLifecycleCounter.inc({ event });
  }

  incrementRefundIssued(
    currency: string,
    kind: 'immediate_cancel' | 'admin' | 'other',
  ) {
    this.billingRefundsIssuedCounter.inc({ currency, kind });
  }

  incrementAdminAction(action: string) {
    this.billingAdminActionsCounter.inc({ action });
  }

  incrementRevenue(currency: string, plan: string, amountMinor: number) {
    this.billingRevenueCounter.inc({ currency, plan }, amountMinor);
  }

  incrementRefundFailure(reason: string) {
    this.billingRefundFailuresCounter.inc({ reason });
  }

  incrementCheckoutAbandoned(kind: 'upgrade' | 'stale_incomplete') {
    this.billingCheckoutAbandonedCounter.inc({ kind });
  }

  incrementDunningExhausted(failureCategory: string) {
    this.billingDunningExhaustedCounter.inc({
      failure_category: failureCategory,
    });
  }

  incrementEmailsScanned(direction: string, verdict: string) {
    this.emailsScannedCounter.inc({ direction, verdict });
  }

  incrementEmailsBlocked(direction: string) {
    this.emailsBlockedCounter.inc({ direction });
  }

  incrementEmailsQuarantined(direction: string) {
    this.emailsQuarantinedCounter.inc({ direction });
  }

  incrementEmailDecryptFailure(entity: string) {
    this.emailDecryptFailuresCounter.inc({ entity });
  }

  incrementHighRiskUsers(level = 'high') {
    this.highRiskUsersCounter.inc({ level });
  }

  incrementHighRiskDomains(level = 'high') {
    this.highRiskDomainsCounter.inc({ level });
  }
}
