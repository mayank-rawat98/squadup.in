import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The remaining application schema: users, settings, passkeys, the four form
 * tables, changelog and the notification tables. Generated from entity metadata
 * (`migration:generate`) rather than hand-written, so it matches the entities
 * exactly. Audit logs live in MongoDB and have no migration here.
 *
 * The uuid-ossp extension is created explicitly: every table below defaults its
 * primary key to uuid_generate_v4(). TypeORM's Postgres driver happens to
 * install that extension on connect, but relying on it would make this
 * migration fail when applied by any tool other than the app (psql, a CI job)
 * or by a role without permission to create extensions.
 */
export class CoreSchema1785669054027 implements MigrationInterface {
    name = 'CoreSchema1785669054027'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TABLE "changelogs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "version" character varying(50) NOT NULL, "date" date NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "changes" jsonb NOT NULL DEFAULT '[]', "releaseType" character varying(10) NOT NULL DEFAULT 'minor', "isMajor" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9016e2783d6d16dda52cc86f021" UNIQUE ("version"), CONSTRAINT "PK_e33d9b851f9ab2b646dbfe659d9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."career_status_enum" AS ENUM('new', 'inProgress', 'resolved', 'needMoreInfo', 'closed')`);
        await queryRunner.query(`CREATE TABLE "career" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticketId" character varying(64) NOT NULL, "fullName" character varying(120) NOT NULL, "email" character varying(255) NOT NULL, "description" character varying NOT NULL, "socialLinks" character varying(120) NOT NULL, "status" "public"."career_status_enum" NOT NULL DEFAULT 'new', "assignedTo" character varying(120), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "summary" character varying(30), CONSTRAINT "UQ_ea905c5937bf1db6b2ae5dbd1a2" UNIQUE ("ticketId"), CONSTRAINT "PK_5f694c0aa9babcae2c4ad61c7d0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ea905c5937bf1db6b2ae5dbd1a" ON "career"  ("ticketId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e08b41e1ec8ea672c8217a56e7" ON "career"  ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."contact_us_inquirytype_enum" AS ENUM('general', 'support', 'sales', 'partnership')`);
        await queryRunner.query(`CREATE TYPE "public"."contact_us_status_enum" AS ENUM('new', 'inProgress', 'resolved', 'needMoreInfo', 'closed')`);
        await queryRunner.query(`CREATE TABLE "contact_us" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticketId" character varying(64) NOT NULL, "firstName" character varying(120) NOT NULL, "lastName" character varying(120) NOT NULL, "email" character varying(255) NOT NULL, "company" character varying(30), "inquiryType" "public"."contact_us_inquirytype_enum" NOT NULL DEFAULT 'general', "message" text NOT NULL, "assignedTo" character varying(120), "status" "public"."contact_us_status_enum" NOT NULL DEFAULT 'new', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "summary" character varying(30), CONSTRAINT "UQ_93cecbb4b3d1ce5aeeb6dc0247c" UNIQUE ("ticketId"), CONSTRAINT "PK_b61766a4d93470109266b976cfe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_93cecbb4b3d1ce5aeeb6dc0247" ON "contact_us"  ("ticketId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ff81dea9d1d4348c462c38b060" ON "contact_us"  ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."grievances_grievancetype_enum" AS ENUM('privacy', 'content', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."grievances_status_enum" AS ENUM('new', 'inProgress', 'resolved', 'needMoreInfo', 'closed')`);
        await queryRunner.query(`CREATE TYPE "public"."grievances_priority_enum" AS ENUM('low', 'medium', 'high', 'urgent')`);
        await queryRunner.query(`CREATE TABLE "grievances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ticketId" character varying(64) NOT NULL, "grievanceType" "public"."grievances_grievancetype_enum" NOT NULL DEFAULT 'other', "subject" character varying(255) NOT NULL, "description" text NOT NULL, "fullName" character varying(120) NOT NULL, "email" character varying(255) NOT NULL, "assignedTo" character varying(120), "status" "public"."grievances_status_enum" NOT NULL DEFAULT 'new', "priority" "public"."grievances_priority_enum" NOT NULL DEFAULT 'medium', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "resolvedAt" TIMESTAMP WITH TIME ZONE, "summary" character varying(30), CONSTRAINT "UQ_abaf2f817ff4aa877849307d700" UNIQUE ("ticketId"), CONSTRAINT "PK_e272c5b9f7d097e8a00fa80fd1b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_abaf2f817ff4aa877849307d70" ON "grievances"  ("ticketId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7b7532077da79612299c0acc07" ON "grievances"  ("email") `);
        await queryRunner.query(`CREATE TYPE "public"."notification_email_queue_status_enum" AS ENUM('PENDING', 'SENT', 'FAILED', 'BOUNCED')`);
        await queryRunner.query(`CREATE TABLE "notification_email_queue" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "notificationId" uuid NOT NULL, "email" character varying(255) NOT NULL, "subject" character varying(500) NOT NULL, "template" character varying(100) NOT NULL DEFAULT 'notification', "variables" jsonb, "status" "public"."notification_email_queue_status_enum" NOT NULL DEFAULT 'PENDING', "attempts" integer NOT NULL DEFAULT '0', "lastError" text, "sentAt" TIMESTAMP WITH TIME ZONE, "scheduledFor" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_dd2fbb42dd636032e903409f371" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_EMAIL_QUEUE_SCHEDULED" ON "notification_email_queue"  ("scheduledFor") `);
        await queryRunner.query(`CREATE INDEX "IDX_EMAIL_QUEUE_STATUS_ATTEMPTS" ON "notification_email_queue"  ("status", "attempts") `);
        await queryRunner.query(`CREATE TYPE "public"."notification_receivers_deliverystatus_enum" AS ENUM('PENDING', 'DELIVERED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "notification_receivers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "notificationId" uuid NOT NULL, "userId" uuid NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "readAt" TIMESTAMP WITH TIME ZONE, "isDeleted" boolean NOT NULL DEFAULT false, "deletedAt" TIMESTAMP WITH TIME ZONE, "deliveryStatus" "public"."notification_receivers_deliverystatus_enum" NOT NULL DEFAULT 'PENDING', "deliveryAttempts" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9b1a6578070c8037bcbd08060f4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_RECEIVER_USER_DELETED" ON "notification_receivers"  ("userId", "isDeleted") `);
        await queryRunner.query(`CREATE INDEX "IDX_RECEIVER_NOTIFICATION" ON "notification_receivers"  ("notificationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_RECEIVER_USER_READ_CREATED" ON "notification_receivers"  ("userId", "isRead", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "newsletters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "name" character varying(120), "subscribed" boolean NOT NULL DEFAULT true, "source" character varying(100), "consentGiven" boolean NOT NULL DEFAULT false, "tags" json, "unsubscribeToken" character varying(64) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "unsubscribedAt" TIMESTAMP WITH TIME ZONE, "summary" character varying(30), CONSTRAINT "UQ_a2464613407914bce01f4cae61d" UNIQUE ("email"), CONSTRAINT "UQ_f9e9775042db265251bb770046f" UNIQUE ("unsubscribeToken"), CONSTRAINT "PK_b63ff3417bbaa6c92061b9f6934" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a2464613407914bce01f4cae61" ON "newsletters"  ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f9e9775042db265251bb770046" ON "newsletters"  ("unsubscribeToken") `);
        await queryRunner.query(`CREATE TYPE "public"."notification_templates_category_enum" AS ENUM('ALL', 'JOB', 'TASK', 'LEAVE', 'INTERVIEW', 'SYSTEM', 'CAMPAIGN', 'EMAIL', 'CRM', 'FORM', 'SECURITY', 'TEMPLATE', 'MARKETPLACE', 'MARKETING', 'BILLING')`);
        await queryRunner.query(`CREATE TABLE "notification_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(100) NOT NULL, "title" character varying(255) NOT NULL, "description" text, "category" "public"."notification_templates_category_enum" NOT NULL, "titleTemplate" text, "messageTemplate" text, "icon" character varying(100), "color" character varying(20), "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_0f527489aa40b6ba96faf6b5024" UNIQUE ("code"), CONSTRAINT "PK_76f0fc48b8d057d2ae7f3a2848a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_TEMPLATE_CODE" ON "notification_templates"  ("code") `);
        await queryRunner.query(`CREATE TYPE "public"."notifications_category_enum" AS ENUM('ALL', 'JOB', 'TASK', 'LEAVE', 'INTERVIEW', 'SYSTEM', 'CAMPAIGN', 'EMAIL', 'CRM', 'FORM', 'SECURITY', 'TEMPLATE', 'MARKETPLACE', 'MARKETING', 'BILLING')`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_entitytype_enum" AS ENUM('JOB', 'TASK', 'LEAVE', 'INTERVIEW', 'APPLICATION', 'CAMPAIGN', 'CONTACT', 'LIST', 'EMAIL', 'DOMAIN', 'USER', 'FORM', 'TEMPLATE', 'TEMPLATE_LISTING', 'SETTING', 'DEVICE', 'AUDIENCE', 'COMPANY', 'FOLDER', 'SUBSCRIPTION', 'INVOICE')`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "templateCode" character varying(100), "category" "public"."notifications_category_enum" NOT NULL, "actorId" uuid, "actorName" character varying(255), "actorAvatar" character varying(500), "entityType" "public"."notifications_entitytype_enum", "entityId" character varying(255), "title" character varying(500) NOT NULL, "message" text NOT NULL, "data" jsonb, "priority" "public"."notifications_priority_enum" NOT NULL DEFAULT 'MEDIUM', "requiresAction" boolean NOT NULL DEFAULT false, "actionUrl" character varying(1000), "idempotencyKey" character varying(255), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_NOTIFICATION_IDEMPOTENCY_KEY" ON "notifications"  ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_NOTIFICATION_ENTITY" ON "notifications"  ("entityType", "entityId") `);
        await queryRunner.query(`CREATE INDEX "IDX_NOTIFICATION_CATEGORY_CREATED" ON "notifications"  ("category", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "user_notification_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "channels" jsonb NOT NULL DEFAULT '{"inApp": true, "email": true, "sms": false}', "categories" jsonb, "quietHours" jsonb NOT NULL DEFAULT '{"enabled": false, "startTime": "22:00", "endTime": "08:00"}', "emailBatching" jsonb NOT NULL DEFAULT '{"enabled": false, "frequency": "daily"}', "unsubscribedCategories" text array NOT NULL DEFAULT '{}', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_fc1bb12707451f64b0ebb377fa9" UNIQUE ("userId"), CONSTRAINT "PK_2b30dfc697b16f75a55be54d464" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_PREFERENCES_USER" ON "user_notification_preferences"  ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."users_accountstatus_enum" AS ENUM('active', 'suspended', 'closed', 'hold')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "phone" character varying(255), "password" character varying(255) NOT NULL, "fullName" character varying(255), "avatarUrl" character varying(500), "isPasswordSet" boolean NOT NULL DEFAULT true, "mustChangePassword" boolean NOT NULL DEFAULT false, "magicLoginToken" character varying(255), "magicLoginTokenExpiresAt" TIMESTAMP WITH TIME ZONE, "emailVerified" boolean NOT NULL DEFAULT false, "phoneVerified" boolean NOT NULL DEFAULT false, "accountStatus" "public"."users_accountstatus_enum" NOT NULL DEFAULT 'hold', "statusReason" text, "statusChangedAt" TIMESTAMP WITH TIME ZONE, "addressLine1" character varying(255), "city" character varying(150), "state" character varying(150), "postalCode" character varying(50), "country" character varying(100), "acceptedTermsAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_USER_PHONE" ON "users"  ("phone") WHERE "phone" IS NOT NULL`);
        await queryRunner.query(`CREATE TABLE "passkey_credential" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "credentialId" character varying(512) NOT NULL, "publicKey" bytea NOT NULL, "counter" bigint NOT NULL DEFAULT '0', "deviceType" character varying(32) NOT NULL DEFAULT 'singleDevice', "backedUp" boolean NOT NULL DEFAULT false, "transports" jsonb, "nickname" character varying(100) NOT NULL, "lastUsedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_192d857208b2315375852a6e373" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5f47d56fa2bae22e145c61e5b4" ON "passkey_credential"  ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_76a098909adb9e6745fc234f67" ON "passkey_credential"  ("credentialId") `);
        await queryRunner.query(`CREATE TYPE "public"."user_settings_dateformat_enum" AS ENUM('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-Mon-YYYY')`);
        await queryRunner.query(`CREATE TABLE "user_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "currency" character varying(8) NOT NULL DEFAULT 'INR', "timezone" character varying(64) NOT NULL DEFAULT 'Asia/Kolkata', "dateFormat" "public"."user_settings_dateformat_enum" NOT NULL DEFAULT 'MM/DD/YYYY', "language" character varying(16) NOT NULL DEFAULT 'en', "isPublicProfile" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "authenticatorEnabled" boolean NOT NULL DEFAULT false, "authenticatorSecret" character varying, "authenticatorBackupcodes" jsonb, "authenticatorPreference" smallint NOT NULL DEFAULT '1', "emailEnabled" boolean NOT NULL DEFAULT false, "emailVerifiedat" TIMESTAMP, "emailPreference" smallint NOT NULL DEFAULT '2', "phoneEnabled" boolean NOT NULL DEFAULT false, "phoneVerifiedat" TIMESTAMP, "phonePreference" smallint NOT NULL DEFAULT '3', "passkeyEnabled" boolean NOT NULL DEFAULT false, "passkeyPreference" smallint NOT NULL DEFAULT '0', "recoveryBackupcodes" jsonb, CONSTRAINT "UQ_986a2b6d3c05eb4091bb8066f78" UNIQUE ("userId"), CONSTRAINT "REL_986a2b6d3c05eb4091bb8066f7" UNIQUE ("userId"), CONSTRAINT "PK_00f004f5922a0744d174530d639" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "notification_receivers" ADD CONSTRAINT "FK_b6fad47e62da71efc099d6147d0" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "passkey_credential" ADD CONSTRAINT "FK_5f47d56fa2bae22e145c61e5b49" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_settings" ADD CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_settings" DROP CONSTRAINT "FK_986a2b6d3c05eb4091bb8066f78"`);
        await queryRunner.query(`ALTER TABLE "passkey_credential" DROP CONSTRAINT "FK_5f47d56fa2bae22e145c61e5b49"`);
        await queryRunner.query(`ALTER TABLE "notification_receivers" DROP CONSTRAINT "FK_b6fad47e62da71efc099d6147d0"`);
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`DROP TYPE "public"."user_settings_dateformat_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_76a098909adb9e6745fc234f67"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5f47d56fa2bae22e145c61e5b4"`);
        await queryRunner.query(`DROP TABLE "passkey_credential"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_USER_PHONE"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_accountstatus_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_PREFERENCES_USER"`);
        await queryRunner.query(`DROP TABLE "user_notification_preferences"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_NOTIFICATION_CATEGORY_CREATED"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_NOTIFICATION_ENTITY"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_NOTIFICATION_IDEMPOTENCY_KEY"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_entitytype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_TEMPLATE_CODE"`);
        await queryRunner.query(`DROP TABLE "notification_templates"`);
        await queryRunner.query(`DROP TYPE "public"."notification_templates_category_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f9e9775042db265251bb770046"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a2464613407914bce01f4cae61"`);
        await queryRunner.query(`DROP TABLE "newsletters"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_RECEIVER_USER_READ_CREATED"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_RECEIVER_NOTIFICATION"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_RECEIVER_USER_DELETED"`);
        await queryRunner.query(`DROP TABLE "notification_receivers"`);
        await queryRunner.query(`DROP TYPE "public"."notification_receivers_deliverystatus_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_EMAIL_QUEUE_STATUS_ATTEMPTS"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_EMAIL_QUEUE_SCHEDULED"`);
        await queryRunner.query(`DROP TABLE "notification_email_queue"`);
        await queryRunner.query(`DROP TYPE "public"."notification_email_queue_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7b7532077da79612299c0acc07"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_abaf2f817ff4aa877849307d70"`);
        await queryRunner.query(`DROP TABLE "grievances"`);
        await queryRunner.query(`DROP TYPE "public"."grievances_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."grievances_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."grievances_grievancetype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ff81dea9d1d4348c462c38b060"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_93cecbb4b3d1ce5aeeb6dc0247"`);
        await queryRunner.query(`DROP TABLE "contact_us"`);
        await queryRunner.query(`DROP TYPE "public"."contact_us_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."contact_us_inquirytype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e08b41e1ec8ea672c8217a56e7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ea905c5937bf1db6b2ae5dbd1a"`);
        await queryRunner.query(`DROP TABLE "career"`);
        await queryRunner.query(`DROP TYPE "public"."career_status_enum"`);
        await queryRunner.query(`DROP TABLE "changelogs"`);
    }

}
