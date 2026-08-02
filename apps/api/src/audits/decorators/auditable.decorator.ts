import { Logger } from '@nestjs/common';
import { AuditsService } from '../audits.service';
import type {
  AuditEventPayload,
  AuditSeverity,
} from '../interfaces/audit-event.interface';

const logger = new Logger('AuditableDecorator');

/**
 * Options for the @Auditable() method decorator.
 */
export interface AuditableOptions {
  /** Audit action string (use AUDIT_ACTIONS constants). */
  action: string;
  /** Resource type string (use AUDIT_RESOURCE constants). */
  resourceType: string;
  /** Severity level. Defaults to 'INFO'. */
  severity?: AuditSeverity;
  /** Category for grouping. */
  category?: string;
  /**
   * Extract the resourceId from the method result or arguments.
   * Receives (result, args) and should return a string.
   * Defaults to 'unknown' if not provided.
   */
  resourceId?: (result: unknown, args: unknown[]) => string;
  /**
   * Extract extra payload fields from the method result or arguments.
   * Receives (result, args) and should return a Partial<AuditEventPayload>.
   */
  extractPayload?: (
    result: unknown,
    args: unknown[],
  ) => Partial<AuditEventPayload>;
  /**
   * If true, also logs failures (with status=FAILURE). Defaults to true.
   */
  logFailure?: boolean;
}

/**
 * Method decorator that automatically emits an audit log after a method succeeds.
 *
 * The host class MUST have `auditsService: AuditsService` as a property
 * (typically injected via constructor).
 *
 * @example
 * ```ts
 * @Auditable({
 *   action: AUDIT_ACTIONS.CAMPAIGN.CREATED,
 *   resourceType: AUDIT_RESOURCE.CAMPAIGN,
 *   severity: 'MEDIUM',
 *   category: AUDIT_CATEGORY.CAMPAIGN,
 *   resourceId: (result) => result.id,
 *   extractPayload: (result) => ({ resourceName: result.name }),
 * })
 * async create(dto: CreateCampaignDto) { ... }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Auditable(options: AuditableOptions): any {
  return function (
    _target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const auditsService: AuditsService | undefined = (this as any)
        .auditsService;

      try {
        const result = await originalMethod.apply(this, args);

        // Fire-and-forget audit log (never block the main flow)
        if (auditsService) {
          const resourceId = options.resourceId
            ? options.resourceId(result, args)
            : 'unknown';

          const extraPayload = options.extractPayload
            ? options.extractPayload(result, args)
            : {};

          auditsService
            .log({
              action: options.action,
              resourceType: options.resourceType,
              resourceId,
              severity: (options.severity ?? 'INFO') as AuditSeverity,
              status: 'SUCCESS',
              category: options.category,
              ...extraPayload,
            })
            .catch((err) =>
              logger.warn(
                `Audit log failed for ${String(propertyKey)}: ${err?.message}`,
              ),
            );
        }

        return result;
      } catch (error) {
        // Log failure if configured (default: true)
        if (auditsService && (options.logFailure ?? true)) {
          const extraPayload = options.extractPayload
            ? options.extractPayload(null, args)
            : {};

          auditsService
            .log({
              action: options.action,
              resourceType: options.resourceType,
              resourceId: 'unknown',
              severity: (options.severity ?? 'MEDIUM') as AuditSeverity,
              status: 'FAILURE',
              category: options.category,
              errorMessage:
                error instanceof Error ? error.message : String(error),
              ...extraPayload,
            })
            .catch((err) =>
              logger.warn(
                `Audit failure log failed for ${String(propertyKey)}: ${err?.message}`,
              ),
            );
        }

        throw error;
      }
    };

    // Preserve method name for debugging
    if (originalMethod) {
      Object.defineProperty(descriptor.value, 'name', {
        value: originalMethod.name,
      });
    }

    return descriptor;
  };
}
