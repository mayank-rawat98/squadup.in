import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the optional public `username` (#49). Expand-only: a nullable column and
 * a unique index, so the running release keeps working while this applies.
 * Usernames are stored lowercase, which makes the plain unique index
 * case-insensitive in effect; Postgres allows any number of NULLs in it.
 *
 * Generated with `migration:generate`, which also proposed resetting the two
 * user_notification_preferences JSONB defaults. Those were dropped: the same
 * false diff from Postgres normalising JSONB key order that
 * PlatformFeatures1790015831339 describes.
 */
export class AddUsername1790618375485 implements MigrationInterface {
  name = 'AddUsername1790618375485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "username" character varying(30)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_USERS_USERNAME" ON "users"  ("username") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_USERS_USERNAME"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
  }
}
