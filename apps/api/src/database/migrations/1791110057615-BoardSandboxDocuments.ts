import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A board room's shared React project (#81): one row per room that has
 * started one, its Yjs state as bytea, deleted with the board. Expand-only:
 * a new table nothing in the running release reads, so it is safe ahead of
 * the deploy.
 *
 * Generated with `migration:generate`, which also proposed resetting the two
 * user_notification_preferences JSONB defaults. Those were dropped: the same
 * false diff from Postgres normalising JSONB key order that
 * PlatformFeatures1790015831339 describes.
 */
export class BoardSandboxDocuments1791110057615 implements MigrationInterface {
  name = 'BoardSandboxDocuments1791110057615';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "board_sandbox_documents" ("boardId" uuid NOT NULL, "state" bytea NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_BOARD_SANDBOX_DOCUMENTS" PRIMARY KEY ("boardId"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_sandbox_documents" ADD CONSTRAINT "FK_BOARD_SANDBOX_DOCUMENTS_BOARD" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "board_sandbox_documents" DROP CONSTRAINT "FK_BOARD_SANDBOX_DOCUMENTS_BOARD"`,
    );
    await queryRunner.query(`DROP TABLE "board_sandbox_documents"`);
  }
}
