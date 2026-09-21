import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Tables for the modules ported from mailtr: blog posts, feature flags with
 * per-user access, the currency / timezone / language reference lists, and
 * per-user guide-tour state. Generated from entity metadata
 * (`migration:generate`), then edited in two ways:
 *
 *  - The reference lists are seeded with the same starter rows mailtr ships,
 *    because user settings validate against them — an empty list would reject
 *    every settings save. Existing user_settings defaults ('INR',
 *    'Asia/Kolkata', 'en') are all in the seed.
 *  - Generation also proposed resetting two JSONB column defaults on
 *    user_notification_preferences. Those were dropped: they are the same
 *    values with the keys in a different order, a false diff from Postgres
 *    normalising JSONB key order, not a schema change.
 */
export class PlatformFeatures1790015831339 implements MigrationInterface {
    name = 'PlatformFeatures1790015831339'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "blog_posts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "slug" character varying(280) NOT NULL, "author" character varying(255) NOT NULL, "createdById" uuid, "category" character varying(32) NOT NULL DEFAULT 'product', "tags" jsonb NOT NULL DEFAULT '[]', "excerpt" text, "content" text NOT NULL DEFAULT '', "coverImageUrl" text, "status" character varying(32) NOT NULL DEFAULT 'draft', "scheduledAt" TIMESTAMP WITH TIME ZONE, "publishedAt" TIMESTAMP WITH TIME ZONE, "readMinutes" integer NOT NULL DEFAULT '1', "views" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP, CONSTRAINT "PK_dd2add25eac93daefc93da9d387" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5b2818a2c45c3edb9991b1c7a5" ON "blog_posts"  ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_e3f7c2c95e891dce6df6473f6c" ON "blog_posts"  ("status", "category") `);
        await queryRunner.query(`CREATE TYPE "public"."feature_flag_user_access_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "feature_flag_user_access" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "featureFlagId" uuid NOT NULL, "userId" uuid NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "status" "public"."feature_flag_user_access_status_enum" NOT NULL DEFAULT 'APPROVED', "requestMessage" text, "rejectionReason" text, "requestedAt" TIMESTAMP WITH TIME ZONE, "decidedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_689e6c6d0bacfd6b9d9ea0f6a82" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6e80a9e48d149f1a8feb31ef72" ON "feature_flag_user_access"  ("featureFlagId", "userId") `);
        await queryRunner.query(`CREATE TABLE "feature_flags" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying(100) NOT NULL, "name" character varying(150) NOT NULL, "description" text, "enabled" boolean NOT NULL DEFAULT true, "isExperimental" boolean NOT NULL DEFAULT false, "rolloutToAll" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_db657d344e9caacfc9d5cf8bbac" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_36d0344370584b4d6a953c53a6" ON "feature_flags"  ("key") `);
        await queryRunner.query(`CREATE TABLE "currencies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(8) NOT NULL, "label" character varying(64) NOT NULL, "symbol" character varying(8), "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9f8d0972aeeb5a2277e40332d29" UNIQUE ("code"), CONSTRAINT "PK_d528c54860c4182db13548e08c4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "languages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(16) NOT NULL, "label" character varying(64) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7397752718d1c9eb873722ec9b2" UNIQUE ("code"), CONSTRAINT "PK_b517f827ca496b29f4d549c631d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "timezones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(64) NOT NULL, "label" character varying(128) NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8d649a4a3159efd07c37edfb618" UNIQUE ("code"), CONSTRAINT "PK_589871db156cc7f92942334ab7e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`INSERT INTO "currencies" ("code","label","symbol") VALUES ('INR','Indian Rupee','₹'), ('USD','US Dollar','$'), ('EUR','Euro','€'), ('GBP','British Pound','£'), ('AUD','Australian Dollar','A$'), ('CAD','Canadian Dollar','C$'), ('JPY','Japanese Yen','¥'), ('SGD','Singapore Dollar','S$'), ('AED','UAE Dirham','د.إ') ON CONFLICT ("code") DO NOTHING`);
        await queryRunner.query(`INSERT INTO "timezones" ("code","label") VALUES ('Asia/Kolkata','India Standard Time (IST)'), ('UTC','Coordinated Universal Time (UTC)'), ('America/New_York','Eastern Time (ET)'), ('America/Los_Angeles','Pacific Time (PT)'), ('America/Chicago','Central Time (CT)'), ('Europe/London','UK Time (GMT/BST)'), ('Europe/Berlin','Central European Time'), ('Europe/Paris','Central European Time (Paris)'), ('Asia/Tokyo','Japan Standard Time'), ('Asia/Singapore','Singapore Time'), ('Asia/Dubai','Gulf Standard Time'), ('Australia/Sydney','Australian Eastern Time') ON CONFLICT ("code") DO NOTHING`);
        await queryRunner.query(`INSERT INTO "languages" ("code","label") VALUES ('en','English') ON CONFLICT ("code") DO NOTHING`);
        await queryRunner.query(`CREATE TABLE "user_tour_state" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "pages" jsonb NOT NULL DEFAULT '{}', "hasSeenIntroModal" boolean NOT NULL DEFAULT false, "hasOptedOutOfTours" boolean NOT NULL DEFAULT false, "seenAnnouncements" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b3e6a9b515c52daffc5b46d5980" UNIQUE ("userId"), CONSTRAINT "REL_b3e6a9b515c52daffc5b46d598" UNIQUE ("userId"), CONSTRAINT "PK_dd50e38390beca0c71b2e552253" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "feature_flag_user_access" ADD CONSTRAINT "FK_41bc034ad680770cf3dff0a805b" FOREIGN KEY ("featureFlagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_tour_state" ADD CONSTRAINT "FK_b3e6a9b515c52daffc5b46d5980" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_tour_state" DROP CONSTRAINT "FK_b3e6a9b515c52daffc5b46d5980"`);
        await queryRunner.query(`ALTER TABLE "feature_flag_user_access" DROP CONSTRAINT "FK_41bc034ad680770cf3dff0a805b"`);
        await queryRunner.query(`DROP TABLE "user_tour_state"`);
        await queryRunner.query(`DROP TABLE "timezones"`);
        await queryRunner.query(`DROP TABLE "languages"`);
        await queryRunner.query(`DROP TABLE "currencies"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_36d0344370584b4d6a953c53a6"`);
        await queryRunner.query(`DROP TABLE "feature_flags"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6e80a9e48d149f1a8feb31ef72"`);
        await queryRunner.query(`DROP TABLE "feature_flag_user_access"`);
        await queryRunner.query(`DROP TYPE "public"."feature_flag_user_access_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e3f7c2c95e891dce6df6473f6c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5b2818a2c45c3edb9991b1c7a5"`);
        await queryRunner.query(`DROP TABLE "blog_posts"`);
    }

}
