/**
 * Centralized notification event definitions.
 *
 * Every feature module uses these constants when calling
 * `NotificationService.emit()`. This ensures consistent titles,
 * messages, categories, and entity types across the entire application.
 *
 * Usage:
 *   import { NOTIFICATION_EVENTS } from '../notifications/constants/notification-events';
 *   await this.notificationService.emit({
 *     ...NOTIFICATION_EVENTS.CAMPAIGN.SEND_STARTED(campaignName),
 *     actorId: userId,
 *     recipientIds: [userId],
 *   });
 */

import {
  NotificationCategory,
  NotificationEntityType,
  NotificationPriority,
} from './notification.constants';

// ─── Helper type ───────────────────────────────────────────────
export interface NotificationEventPayload {
  category: NotificationCategory;
  entityType: NotificationEntityType;
  title: string;
  message: string;
  priority: NotificationPriority;
}

// ═══════════════════════════════════════════════════════════════
//  CAMPAIGN EVENTS
// ═══════════════════════════════════════════════════════════════
export const NOTIFICATION_EVENTS = {
  CAMPAIGN: {
    SEND_STARTED: (campaignName: string): NotificationEventPayload => ({
      category: NotificationCategory.CAMPAIGN,
      entityType: NotificationEntityType.CAMPAIGN,
      title: 'Campaign Send Started',
      message: `Your campaign "${campaignName}" is now sending.`,
      priority: NotificationPriority.MEDIUM,
    }),
    COMPLETED: (
      campaignName: string,
      stats: { sent: number; failed: number; bounced: number },
    ): NotificationEventPayload => ({
      category: NotificationCategory.CAMPAIGN,
      entityType: NotificationEntityType.CAMPAIGN,
      title: 'Campaign Completed',
      message: `Your campaign "${campaignName}" has finished — ${stats.sent} sent, ${stats.failed} failed, ${stats.bounced} bounced.`,
      priority: NotificationPriority.HIGH,
    }),
    PAUSED: (campaignName: string): NotificationEventPayload => ({
      category: NotificationCategory.CAMPAIGN,
      entityType: NotificationEntityType.CAMPAIGN,
      title: 'Campaign Paused',
      message: `Your campaign "${campaignName}" has been paused.`,
      priority: NotificationPriority.MEDIUM,
    }),
    RESUMED: (campaignName: string): NotificationEventPayload => ({
      category: NotificationCategory.CAMPAIGN,
      entityType: NotificationEntityType.CAMPAIGN,
      title: 'Campaign Resumed',
      message: `Your campaign "${campaignName}" has been resumed and is now sending.`,
      priority: NotificationPriority.MEDIUM,
    }),
    CREATED: (campaignName: string): NotificationEventPayload => ({
      category: NotificationCategory.CAMPAIGN,
      entityType: NotificationEntityType.CAMPAIGN,
      title: 'Campaign Created',
      message: `Your campaign "${campaignName}" has been created successfully.`,
      priority: NotificationPriority.LOW,
    }),
    UPDATED: (campaignName: string): NotificationEventPayload => ({
      category: NotificationCategory.CAMPAIGN,
      entityType: NotificationEntityType.CAMPAIGN,
      title: 'Campaign Updated',
      message: `Your campaign "${campaignName}" has been updated.`,
      priority: NotificationPriority.LOW,
    }),
    DELETED: (count: number): NotificationEventPayload => ({
      category: NotificationCategory.CAMPAIGN,
      entityType: NotificationEntityType.CAMPAIGN,
      title: 'Campaign Deleted',
      message: `${count} campaign${count !== 1 ? 's have' : ' has'} been deleted.`,
      priority: NotificationPriority.MEDIUM,
    }),
    AUDIENCE_ADDED: (campaignName: string): NotificationEventPayload => ({
      category: NotificationCategory.CAMPAIGN,
      entityType: NotificationEntityType.AUDIENCE,
      title: 'Audience Added',
      message: `Audience has been added to campaign "${campaignName}".`,
      priority: NotificationPriority.LOW,
    }),
    AUDIENCE_UPDATED: (campaignName: string): NotificationEventPayload => ({
      category: NotificationCategory.CAMPAIGN,
      entityType: NotificationEntityType.AUDIENCE,
      title: 'Audience Updated',
      message: `Audience for campaign "${campaignName}" has been updated.`,
      priority: NotificationPriority.LOW,
    }),
    AUDIENCE_DELETED: (campaignName: string): NotificationEventPayload => ({
      category: NotificationCategory.CAMPAIGN,
      entityType: NotificationEntityType.AUDIENCE,
      title: 'Audience Removed',
      message: `Audience entries have been removed from campaign "${campaignName}".`,
      priority: NotificationPriority.LOW,
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  //  DOMAIN EVENTS
  // ═══════════════════════════════════════════════════════════════
  DOMAIN: {
    ADDED: (domainName: string): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.DOMAIN,
      title: 'Domain Added',
      message: `Domain "${domainName}" has been added. Please configure your DNS records to complete verification.`,
      priority: NotificationPriority.MEDIUM,
    }),
    VERIFIED: (domainName: string): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.DOMAIN,
      title: 'Domain Verified',
      message: `Domain "${domainName}" has been fully verified! You can now send emails from this domain.`,
      priority: NotificationPriority.HIGH,
    }),
    DNS_PARTIAL: (
      domainName: string,
      missing: string[],
    ): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.DOMAIN,
      title: 'Domain DNS Incomplete',
      message: `Domain "${domainName}" still needs: ${missing.join(', ')}. Please update your DNS records.`,
      priority: NotificationPriority.MEDIUM,
    }),
    REMOVED: (domainName: string): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.DOMAIN,
      title: 'Domain Removed',
      message: `Domain "${domainName}" has been removed from your account.`,
      priority: NotificationPriority.LOW,
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  //  EMAIL ADDRESS EVENTS
  // ═══════════════════════════════════════════════════════════════
  EMAIL_ADDRESS: {
    ADDED: (emailAddress: string): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: 'Email Address Added',
      message: `Email address "${emailAddress}" has been added to your account.`,
      priority: NotificationPriority.LOW,
    }),
    VERIFIED: (emailAddress: string): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: 'Email Address Verified',
      message: `Email address "${emailAddress}" has been verified. You can now use it to send emails.`,
      priority: NotificationPriority.MEDIUM,
    }),
    MARKED_FOR_DELETION: (emailAddress: string): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: 'Email Address Marked for Deletion',
      message: `Email address "${emailAddress}" is marked for deletion. You can restore it within 7 days before it's permanently deleted.`,
      priority: NotificationPriority.MEDIUM,
    }),
    PERMANENTLY_DELETED: (emailAddress: string): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: 'Email Address Deleted',
      message: `Email address "${emailAddress}" and all of its mail have been permanently deleted.`,
      priority: NotificationPriority.MEDIUM,
    }),
    ACCOUNT_ADDED: (emailAddress: string): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: 'Account Email Registered',
      message: `Your account email "${emailAddress}" has been registered. Please verify it to start sending.`,
      priority: NotificationPriority.LOW,
    }),
    ACCOUNT_VERIFIED: (emailAddress: string): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: 'Account Email Verified',
      message: `Your account email "${emailAddress}" is now verified.`,
      priority: NotificationPriority.MEDIUM,
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  //  SECURITY EVENTS (Auth + Settings 2FA)
  // ═══════════════════════════════════════════════════════════════
  SECURITY: {
    LOGIN_NEW_DEVICE: (
      deviceInfo: string,
      location: string,
    ): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.DEVICE,
      title: 'New Device Login',
      message: `A new login was detected from ${deviceInfo} in ${location}. If this wasn't you, please secure your account immediately.`,
      priority: NotificationPriority.HIGH,
    }),
    LOGOUT_ALL_DEVICES: (): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.USER,
      title: 'All Devices Logged Out',
      message:
        'All your active sessions have been terminated. You will need to log in again on each device.',
      priority: NotificationPriority.HIGH,
    }),
    DEVICE_REVOKED: (deviceId: string): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.DEVICE,
      title: 'Device Revoked',
      message: `A device session (${deviceId.slice(0, 8)}…) has been revoked from your account.`,
      priority: NotificationPriority.MEDIUM,
    }),
    TWO_FACTOR_ENABLED: (method: string): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.SETTING,
      title: 'Two-Factor Authentication Enabled',
      message: `Two-factor authentication via ${method} has been enabled on your account.`,
      priority: NotificationPriority.HIGH,
    }),
    TWO_FACTOR_DISABLED: (method: string): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.SETTING,
      title: 'Two-Factor Authentication Disabled',
      message: `Two-factor authentication via ${method} has been disabled on your account. Your account may be less secure.`,
      priority: NotificationPriority.HIGH,
    }),
    BACKUP_CODES_REGENERATED: (): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.SETTING,
      title: 'Backup Codes Regenerated',
      message:
        'Your backup codes have been regenerated. Previous backup codes are no longer valid.',
      priority: NotificationPriority.HIGH,
    }),
    PASSWORD_RESET: (): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.USER,
      title: 'Password Changed',
      message:
        'Your password has been successfully changed. If you did not make this change, please contact support immediately.',
      priority: NotificationPriority.CRITICAL,
    }),
    EMAIL_VERIFIED: (): NotificationEventPayload => ({
      category: NotificationCategory.SYSTEM,
      entityType: NotificationEntityType.USER,
      title: 'Email Verified',
      message: 'Your email address has been verified. Welcome to Squadup!',
      priority: NotificationPriority.MEDIUM,
    }),
    PHONE_VERIFIED: (): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.USER,
      title: 'Phone Number Verified',
      message: 'Your phone number has been verified successfully.',
      priority: NotificationPriority.MEDIUM,
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  //  FORM SUBMISSIONS
  // ═══════════════════════════════════════════════════════════════
  FORM: {
    CONTACT_US_SUBMITTED: (ticketId: string): NotificationEventPayload => ({
      category: NotificationCategory.FORM,
      entityType: NotificationEntityType.FORM,
      title: 'New Contact Us Submission',
      message: `A new contact form submission has been received (Ticket: ${ticketId}).`,
      priority: NotificationPriority.MEDIUM,
    }),
    GRIEVANCE_SUBMITTED: (ticketId: string): NotificationEventPayload => ({
      category: NotificationCategory.FORM,
      entityType: NotificationEntityType.FORM,
      title: 'New Grievance Submitted',
      message: `A new grievance has been submitted (Ticket: ${ticketId}).`,
      priority: NotificationPriority.HIGH,
    }),
    CAREER_SUBMITTED: (
      ticketId: string,
      name: string,
    ): NotificationEventPayload => ({
      category: NotificationCategory.FORM,
      entityType: NotificationEntityType.FORM,
      title: 'New Career Application',
      message: `A new career application from ${name} has been received (Ticket: ${ticketId}).`,
      priority: NotificationPriority.MEDIUM,
    }),
    NEWSLETTER_SUBSCRIBED: (email: string): NotificationEventPayload => ({
      category: NotificationCategory.FORM,
      entityType: NotificationEntityType.FORM,
      title: 'New Newsletter Subscriber',
      message: `A new newsletter subscription from ${email} has been received.`,
      priority: NotificationPriority.LOW,
    }),
    NEWSLETTER_UNSUBSCRIBED: (email: string): NotificationEventPayload => ({
      category: NotificationCategory.FORM,
      entityType: NotificationEntityType.FORM,
      title: 'Newsletter Unsubscription',
      message: `${email} has unsubscribed from the newsletter.`,
      priority: NotificationPriority.LOW,
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  //  TEMPLATE / MARKETPLACE EVENTS
  // ═══════════════════════════════════════════════════════════════
  TEMPLATE: {
    CLONED: (
      templateName: string,
      clonerName: string,
    ): NotificationEventPayload => ({
      category: NotificationCategory.MARKETPLACE,
      entityType: NotificationEntityType.TEMPLATE,
      title: 'Template Cloned',
      message: `Your template "${templateName}" was cloned by ${clonerName} from the marketplace.`,
      priority: NotificationPriority.MEDIUM,
    }),
    LISTED: (templateName: string): NotificationEventPayload => ({
      category: NotificationCategory.MARKETPLACE,
      entityType: NotificationEntityType.TEMPLATE_LISTING,
      title: 'Template Listed on Marketplace',
      message: `Your template "${templateName}" is now live on the marketplace.`,
      priority: NotificationPriority.MEDIUM,
    }),
    UNLISTED: (templateName: string): NotificationEventPayload => ({
      category: NotificationCategory.MARKETPLACE,
      entityType: NotificationEntityType.TEMPLATE_LISTING,
      title: 'Template Unlisted from Marketplace',
      message: `Your template "${templateName}" has been removed from the marketplace.`,
      priority: NotificationPriority.LOW,
    }),
    CREATED: (templateName: string): NotificationEventPayload => ({
      category: NotificationCategory.TEMPLATE,
      entityType: NotificationEntityType.TEMPLATE,
      title: 'Template Created',
      message: `Your template "${templateName}" has been created successfully.`,
      priority: NotificationPriority.LOW,
    }),
    UPDATED: (
      templateName: string,
      version: number,
    ): NotificationEventPayload => ({
      category: NotificationCategory.TEMPLATE,
      entityType: NotificationEntityType.TEMPLATE,
      title: 'Template Updated',
      message: `Your template "${templateName}" has been updated to version ${version}.`,
      priority: NotificationPriority.LOW,
    }),
    DELETED: (templateName: string): NotificationEventPayload => ({
      category: NotificationCategory.TEMPLATE,
      entityType: NotificationEntityType.TEMPLATE,
      title: 'Template Deleted',
      message: `Your template "${templateName}" has been archived and is no longer available.`,
      priority: NotificationPriority.MEDIUM,
    }),
    PUBLISHED: (templateName: string): NotificationEventPayload => ({
      category: NotificationCategory.TEMPLATE,
      entityType: NotificationEntityType.TEMPLATE,
      title: 'Template Published',
      message: `Your template "${templateName}" has been published and is ready for use in campaigns.`,
      priority: NotificationPriority.MEDIUM,
    }),
    WORKING_DRAFT_CREATED: (
      templateName: string,
    ): NotificationEventPayload => ({
      category: NotificationCategory.TEMPLATE,
      entityType: NotificationEntityType.TEMPLATE,
      title: 'Working Draft Created',
      message: `A working draft has been created for your published template "${templateName}". Edit and publish when ready.`,
      priority: NotificationPriority.LOW,
    }),
    FLAGGED_FOR_REVIEW: (
      templateName: string,
      reasons?: string,
    ): NotificationEventPayload => ({
      category: NotificationCategory.TEMPLATE,
      entityType: NotificationEntityType.TEMPLATE,
      title: 'Template Flagged for Review',
      message: reasons
        ? `Your template "${templateName}" has been flagged for manual review: ${reasons}. It cannot be published until a reviewer approves it.`
        : `Your template "${templateName}" has been flagged for manual review due to potentially unsafe content. It cannot be published until a reviewer approves it.`,
      priority: NotificationPriority.HIGH,
    }),
    APPROVED: (templateName: string): NotificationEventPayload => ({
      category: NotificationCategory.TEMPLATE,
      entityType: NotificationEntityType.TEMPLATE,
      title: 'Template Approved',
      message: `Your template "${templateName}" has been reviewed and approved. You can now publish it.`,
      priority: NotificationPriority.HIGH,
    }),
    REJECTED: (templateName: string): NotificationEventPayload => ({
      category: NotificationCategory.TEMPLATE,
      entityType: NotificationEntityType.TEMPLATE,
      title: 'Template Rejected',
      message: `Your template "${templateName}" has been reviewed and rejected due to policy violations. It cannot be published.`,
      priority: NotificationPriority.HIGH,
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  //  CRM EVENTS (Contacts, Lists, Companies, Folders)
  // ═══════════════════════════════════════════════════════════════
  CRM: {
    CONTACT_CREATED: (name: string): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.CONTACT,
      title: 'Contact Added',
      message: `Contact "${name}" has been added to your CRM.`,
      priority: NotificationPriority.LOW,
    }),
    CONTACT_UPDATED: (name: string): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.CONTACT,
      title: 'Contact Updated',
      message: `Contact "${name}" has been updated.`,
      priority: NotificationPriority.LOW,
    }),
    CONTACT_DELETED: (count: number): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.CONTACT,
      title: 'Contact Deleted',
      message: `${count} contact${count !== 1 ? 's have' : ' has'} been removed from your CRM.`,
      priority: NotificationPriority.LOW,
    }),
    LIST_CREATED: (name: string): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.LIST,
      title: 'List Created',
      message: `List "${name}" has been created.`,
      priority: NotificationPriority.LOW,
    }),
    LIST_UPDATED: (name: string): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.LIST,
      title: 'List Updated',
      message: `List "${name}" has been updated.`,
      priority: NotificationPriority.LOW,
    }),
    LIST_DELETED: (count: number): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.LIST,
      title: 'List Deleted',
      message: `${count} list${count !== 1 ? 's have' : ' has'} been deleted.`,
      priority: NotificationPriority.LOW,
    }),
    CONTACTS_ADDED_TO_LIST: (
      contactCount: number,
      listCount: number,
    ): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.LIST,
      title: 'Contacts Added to List',
      message: `${contactCount} contact${contactCount !== 1 ? 's' : ''} added to ${listCount} list${listCount !== 1 ? 's' : ''}.`,
      priority: NotificationPriority.LOW,
    }),
    CONTACTS_REMOVED_FROM_LIST: (count: number): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.LIST,
      title: 'Contacts Removed from List',
      message: `${count} contact${count !== 1 ? 's have' : ' has'} been removed from the list.`,
      priority: NotificationPriority.LOW,
    }),
    COMPANY_CREATED: (name: string): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.COMPANY,
      title: 'Company Added',
      message: `Company "${name}" has been added to your CRM.`,
      priority: NotificationPriority.LOW,
    }),
    COMPANY_UPDATED: (name: string): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.COMPANY,
      title: 'Company Updated',
      message: `Company "${name}" has been updated.`,
      priority: NotificationPriority.LOW,
    }),
    COMPANY_DELETED: (count: number): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.COMPANY,
      title: 'Company Deleted',
      message: `${count} compan${count !== 1 ? 'ies have' : 'y has'} been removed from your CRM.`,
      priority: NotificationPriority.LOW,
    }),
    CONTACTS_ADDED_TO_COMPANY: (
      contactCount: number,
      companyCount: number,
    ): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.COMPANY,
      title: 'Contacts Added to Company',
      message: `${contactCount} contact${contactCount !== 1 ? 's' : ''} added to ${companyCount} compan${companyCount !== 1 ? 'ies' : 'y'}.`,
      priority: NotificationPriority.LOW,
    }),
    CONTACTS_REMOVED_FROM_COMPANY: (
      count: number,
    ): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.COMPANY,
      title: 'Contacts Removed from Company',
      message: `${count} contact${count !== 1 ? 's have' : ' has'} been removed from the company.`,
      priority: NotificationPriority.LOW,
    }),
    FOLDER_CREATED: (name: string): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.FOLDER,
      title: 'Folder Created',
      message: `Folder "${name}" has been created.`,
      priority: NotificationPriority.LOW,
    }),
    FOLDER_UPDATED: (name: string): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.FOLDER,
      title: 'Folder Updated',
      message: `Folder "${name}" has been updated.`,
      priority: NotificationPriority.LOW,
    }),
    FOLDER_DELETED: (): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.FOLDER,
      title: 'Folder Deleted',
      message: 'A list folder has been deleted.',
      priority: NotificationPriority.LOW,
    }),
    CSV_IMPORT_COMPLETED: (
      successCount: number,
      failedCount: number,
    ): NotificationEventPayload => ({
      category: NotificationCategory.CRM,
      entityType: NotificationEntityType.CONTACT,
      title: 'Contacts extraction completed.',
      message:
        `${successCount} contact${successCount !== 1 ? 's' : ''} imported successfully. ${failedCount > 0 ? `${failedCount} contact${failedCount !== 1 ? 's' : ''} skipped due to missing required fields.` : ''}`.trim(),
      priority: NotificationPriority.MEDIUM,
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  //  PROGRAMMATIC MAIL EVENTS
  // ═══════════════════════════════════════════════════════════════
  PROGRAMMATIC: {
    API_KEY_CREATED: (name: string): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.SETTING,
      title: 'API Key Created',
      message: `Programmatic API key "${name}" has been created.`,
      priority: NotificationPriority.MEDIUM,
    }),
    API_KEY_REVOKED: (name: string): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.SETTING,
      title: 'API Key Revoked',
      message: `Programmatic API key "${name}" has been revoked.`,
      priority: NotificationPriority.HIGH,
    }),
    SMTP_CREDENTIAL_CREATED: (username: string): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.SETTING,
      title: 'SMTP Credential Created',
      message: `SMTP credential "${username}" has been generated for programmatic sending.`,
      priority: NotificationPriority.MEDIUM,
    }),
    SMTP_CREDENTIAL_ROTATED: (username: string): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.SETTING,
      title: 'SMTP Credential Rotated',
      message: `SMTP credential "${username}" has been rotated.`,
      priority: NotificationPriority.HIGH,
    }),
    SMTP_CREDENTIAL_REVOKED: (username: string): NotificationEventPayload => ({
      category: NotificationCategory.SECURITY,
      entityType: NotificationEntityType.SETTING,
      title: 'SMTP Credential Revoked',
      message: `SMTP credential "${username}" has been revoked.`,
      priority: NotificationPriority.HIGH,
    }),
    QUOTA_ISSUE: (message: string): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: 'Programmatic Sending Limit Reached',
      message,
      priority: NotificationPriority.HIGH,
    }),
    SENDER_VERIFICATION_REQUIRED: (
      senderAddress: string,
    ): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: 'Verified Sender Required',
      message: `Programmatic sending was blocked because "${senderAddress}" is not available as a verified sender.`,
      priority: NotificationPriority.HIGH,
    }),
    DELIVERY_FAILED: (
      channel: 'API' | 'SMTP',
      reason: string,
    ): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: `Programmatic ${channel} Delivery Failed`,
      message: reason,
      priority: NotificationPriority.HIGH,
    }),
    API_ACTIVITY_SUMMARY: (count: number): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: 'Programmatic API Activity',
      message: `${count} emails have been queued via the API in the last hour.`,
      priority: NotificationPriority.MEDIUM,
    }),
    SMTP_ACTIVITY_DETECTED: (count: number): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: 'SMTP Activity Detected',
      message: `${count} email${count === 1 ? '' : 's'} have been queued via SMTP today.`,
      priority: NotificationPriority.MEDIUM,
    }),
    ACTIVITY_SPIKE: (
      channel: 'API' | 'SMTP',
      count: number,
    ): NotificationEventPayload => ({
      category: NotificationCategory.EMAIL,
      entityType: NotificationEntityType.EMAIL,
      title: 'Programmatic Mail Spike Detected',
      message: `Unusual ${channel} activity detected: ${count} emails queued in a short period.`,
      priority: NotificationPriority.HIGH,
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  //  EXPERIMENTAL FEATURE REQUEST EVENTS
  // ═══════════════════════════════════════════════════════════════
  FEATURE_REQUEST: {
    SUBMITTED: (
      featureName: string,
      requesterName: string,
    ): NotificationEventPayload => ({
      category: NotificationCategory.SYSTEM,
      entityType: NotificationEntityType.SETTING,
      title: 'New Experimental Feature Request',
      message: `${requesterName} requested access to the experimental feature "${featureName}".`,
      priority: NotificationPriority.MEDIUM,
    }),
    APPROVED: (featureName: string): NotificationEventPayload => ({
      category: NotificationCategory.SYSTEM,
      entityType: NotificationEntityType.SETTING,
      title: 'Experimental Feature Approved',
      message: `Your request for the experimental feature "${featureName}" has been approved. You now have access.`,
      priority: NotificationPriority.HIGH,
    }),
    REJECTED: (
      featureName: string,
      reason?: string,
    ): NotificationEventPayload => ({
      category: NotificationCategory.SYSTEM,
      entityType: NotificationEntityType.SETTING,
      title: 'Experimental Feature Request Declined',
      message: reason
        ? `Your request for the experimental feature "${featureName}" was declined: ${reason}`
        : `Your request for the experimental feature "${featureName}" was declined.`,
      priority: NotificationPriority.MEDIUM,
    }),
  },

  // ═══════════════════════════════════════════════════════════════
  //  LIBRARY STORAGE EVENTS
  // ═══════════════════════════════════════════════════════════════
  LIBRARY: {
    STORAGE_THRESHOLD: (
      percent: number,
      used: string,
      limit: string,
    ): NotificationEventPayload => ({
      category: NotificationCategory.SYSTEM,
      entityType: NotificationEntityType.SETTING,
      title: `Library Storage ${percent}% Full`,
      message: `Your organisation's library storage is ${percent}% full (${used} of ${limit}). Free up space by deleting unused images, or upgrade your plan.`,
      priority:
        percent >= 90 ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
    }),
  },
} as const;
