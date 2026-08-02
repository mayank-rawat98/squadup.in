import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  EMAIL_TEMPLATE_CATALOGUE,
  EMAIL_AUDIENCE,
} from '../../mailer/constants/mailer.constants';
import { STAFF_ROLE_ADMIN } from '../../staff/constants/staff.constants';

/**
 * Creates the ops-realm `staff` table and the `email_templates` mapping table,
 * and seeds one unconfigured row per known email so the ops dashboard lists the
 * full catalogue on a fresh database.
 *
 * NOTE — bootstrapping the first operator is deliberately manual; there is no
 * seeded account and no self-signup. Create one with a bcrypt hash (cost 12):
 *
 *   INSERT INTO staff (email, password, "fullName", role, status)
 *   VALUES ('ops@squadup.in', '<bcrypt-hash>', 'Ops Admin', 'admin', 'active');
 *
 * The application never hashes on UPDATE, so the value inserted here must
 * already be a bcrypt hash — a plaintext password will simply never match.
 */
export class CreateStaffAndEmailTemplates1785628800000
  implements MigrationInterface
{
  name = 'CreateStaffAndEmailTemplates1785628800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TYPE "staff_status_enum" AS ENUM ('active', 'suspended')
    `);

    await queryRunner.query(`
      CREATE TABLE "staff" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "password" character varying(255) NOT NULL,
        "fullName" character varying(120),
        "role" character varying(32) NOT NULL DEFAULT '${STAFF_ROLE_ADMIN}',
        "status" "staff_status_enum" NOT NULL DEFAULT 'active',
        "lastLoginAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_staff_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_staff_email" ON "staff" ("email")`,
    );

    await queryRunner.query(`
      CREATE TABLE "email_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "emailType" character varying(64) NOT NULL,
        "audience" character varying(16) NOT NULL DEFAULT '${EMAIL_AUDIENCE.USER}',
        "templateId" character varying(128),
        "label" character varying(160),
        "fromEmail" character varying(255),
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_email_templates_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_EMAIL_TEMPLATE_TYPE_AUDIENCE"
        ON "email_templates" ("emailType", "audience")
    `);

    // Seed the catalogue with empty templateIds — the admin fills these in from
    // the ops dashboard once the templates exist in mailtr.
    for (const entry of EMAIL_TEMPLATE_CATALOGUE) {
      await queryRunner.query(
        `INSERT INTO "email_templates" ("emailType", "audience", "label")
         VALUES ($1, $2, $3)
         ON CONFLICT ("emailType", "audience") DO NOTHING`,
        [entry.emailType, entry.audience, entry.label],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_EMAIL_TEMPLATE_TYPE_AUDIENCE"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "email_templates"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_staff_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "staff_status_enum"`);
  }
}
