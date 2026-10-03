import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * React + TypeScript sandboxes (ROADMAP Milestone 5, #79): one row per saved
 * project, its files as JSONB. Expand-only: a new table nothing in the
 * running release reads, so it is safe ahead of the deploy.
 *
 * Generated with `migration:generate`, which also proposed resetting the two
 * user_notification_preferences JSONB defaults. Those were dropped: the same
 * false diff from Postgres normalising JSONB key order that
 * PlatformFeatures1790015831339 describes.
 */
export class ReactSandboxes1791062756688 implements MigrationInterface {
  name = 'ReactSandboxes1791062756688';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sandboxes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ownerId" uuid NOT NULL, "name" character varying(80) NOT NULL, "files" jsonb NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_SANDBOXES" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_SANDBOXES_OWNER_UPDATED" ON "sandboxes"  ("ownerId", "updatedAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sandboxes" ADD CONSTRAINT "FK_SANDBOXES_OWNER" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sandboxes" DROP CONSTRAINT "FK_SANDBOXES_OWNER"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_SANDBOXES_OWNER_UPDATED"`,
    );
    await queryRunner.query(`DROP TABLE "sandboxes"`);
  }
}
