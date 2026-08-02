import { Global, Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpMetricsInterceptor } from '../common/interceptors/http-metrics.interceptor';
import {
  auditEventsTotal,
  auditProcessingDuration,
  auditRetriesTotal,
  auditFailuresTotal,
  billingPaymentFailuresTotal,
  billingSubscriptionLifecycleTotal,
  billingRefundsIssuedTotal,
  billingAdminActionsTotal,
  billingRevenueTotal,
  billingRefundFailuresTotal,
  billingCheckoutAbandonedTotal,
  billingDunningExhaustedTotal,
  emailsBlockedTotal,
  emailsQuarantinedTotal,
  emailsScannedTotal,
  encryptionDecryptFailuresTotal,
  highRiskDomainsTotal,
  highRiskUsersTotal,
  httpRequestDuration,
} from './metrics.provider';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  imports: [PrometheusModule],
  providers: [
    httpRequestDuration,
    auditEventsTotal,
    auditProcessingDuration,
    auditRetriesTotal,
    auditFailuresTotal,
    billingPaymentFailuresTotal,
    billingSubscriptionLifecycleTotal,
    billingRefundsIssuedTotal,
    billingAdminActionsTotal,
    billingRevenueTotal,
    billingRefundFailuresTotal,
    billingCheckoutAbandonedTotal,
    billingDunningExhaustedTotal,
    emailsScannedTotal,
    emailsBlockedTotal,
    emailsQuarantinedTotal,
    encryptionDecryptFailuresTotal,
    highRiskUsersTotal,
    highRiskDomainsTotal,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
    MetricsService,
  ],
  exports: [
    httpRequestDuration,
    auditEventsTotal,
    auditProcessingDuration,
    auditRetriesTotal,
    auditFailuresTotal,
    billingPaymentFailuresTotal,
    billingSubscriptionLifecycleTotal,
    billingRefundsIssuedTotal,
    billingAdminActionsTotal,
    billingRevenueTotal,
    billingRefundFailuresTotal,
    billingCheckoutAbandonedTotal,
    billingDunningExhaustedTotal,
    emailsScannedTotal,
    emailsBlockedTotal,
    emailsQuarantinedTotal,
    encryptionDecryptFailuresTotal,
    highRiskUsersTotal,
    highRiskDomainsTotal,
    MetricsService,
  ],
  controllers: [MetricsController],
})
export class MetricsModule {}
