import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Coding boards expire 7 days after they're created (BOARD_RETENTION_DAYS).
 * Adds `boards.expiresAt` with a database default, so the release still
 * running during a deploy keeps inserting boards without knowing about it,
 * and backfills existing rooms from their own creation time.
 *
 * Generated with `migration:generate`, which also proposed resetting the two
 * user_notification_preferences JSONB defaults. Those were dropped: the same
 * false diff from Postgres normalising JSONB key order that
 * PlatformFeatures1790015831339 describes.
 */
export class BoardExpiry1791061530832 implements MigrationInterface {
  name = 'BoardExpiry1791061530832';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "boards" ADD "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + interval '7 days'`,
    );
    await queryRunner.query(
      `UPDATE "boards" SET "expiresAt" = "createdAt" + interval '7 days'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_BOARDS_EXPIRES" ON "boards"  ("expiresAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_BOARDS_EXPIRES"`);
    await queryRunner.query(`ALTER TABLE "boards" DROP COLUMN "expiresAt"`);
  }
}
