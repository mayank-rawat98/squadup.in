import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The coding board (ROADMAP Milestone 5): boards, their members, chat
 * messages and the stored Yjs document. Expand-only: four new tables and two
 * enums, nothing the running release reads, so it is safe ahead of the deploy.
 *
 * Generated with `migration:generate`, which also proposed resetting the two
 * user_notification_preferences JSONB defaults. Those were dropped: the same
 * false diff from Postgres normalising JSONB key order that
 * PlatformFeatures1790015831339 describes.
 */
export class CodingBoards1791054074063 implements MigrationInterface {
  name = 'CodingBoards1791054074063';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."boards_language_enum" AS ENUM('cpp', 'java', 'python', 'c', 'javascript')`,
    );
    await queryRunner.query(
      `CREATE TABLE "boards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character(5) NOT NULL, "name" character varying(80) NOT NULL, "language" "public"."boards_language_enum" NOT NULL DEFAULT 'cpp', "seats" smallint NOT NULL DEFAULT '8', "hostId" uuid NOT NULL, "closedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_BOARDS" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_BOARDS_CODE" ON "boards"  ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_BOARDS_HOST" ON "boards"  ("hostId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "board_documents" ("boardId" uuid NOT NULL, "state" bytea NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_BOARD_DOCUMENTS" PRIMARY KEY ("boardId"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."board_members_role_enum" AS ENUM('host', 'member')`,
    );
    await queryRunner.query(
      `CREATE TABLE "board_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "boardId" uuid NOT NULL, "userId" uuid NOT NULL, "role" "public"."board_members_role_enum" NOT NULL DEFAULT 'member', "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_BOARD_MEMBERS" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_BOARD_MEMBERS_USER_JOINED" ON "board_members"  ("userId", "joinedAt") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_BOARD_MEMBERS_BOARD_USER" ON "board_members"  ("boardId", "userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "board_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "boardId" uuid NOT NULL, "authorId" uuid NOT NULL, "body" character varying(2000) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_BOARD_MESSAGES" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_BOARD_MESSAGES_BOARD_CREATED" ON "board_messages"  ("boardId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "boards" ADD CONSTRAINT "FK_BOARDS_HOST" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_documents" ADD CONSTRAINT "FK_BOARD_DOCUMENTS_BOARD" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" ADD CONSTRAINT "FK_BOARD_MEMBERS_BOARD" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" ADD CONSTRAINT "FK_BOARD_MEMBERS_USER" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_messages" ADD CONSTRAINT "FK_BOARD_MESSAGES_BOARD" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_messages" ADD CONSTRAINT "FK_BOARD_MESSAGES_AUTHOR" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "board_messages" DROP CONSTRAINT "FK_BOARD_MESSAGES_AUTHOR"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_messages" DROP CONSTRAINT "FK_BOARD_MESSAGES_BOARD"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" DROP CONSTRAINT "FK_BOARD_MEMBERS_USER"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_members" DROP CONSTRAINT "FK_BOARD_MEMBERS_BOARD"`,
    );
    await queryRunner.query(
      `ALTER TABLE "board_documents" DROP CONSTRAINT "FK_BOARD_DOCUMENTS_BOARD"`,
    );
    await queryRunner.query(
      `ALTER TABLE "boards" DROP CONSTRAINT "FK_BOARDS_HOST"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_BOARD_MESSAGES_BOARD_CREATED"`,
    );
    await queryRunner.query(`DROP TABLE "board_messages"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_BOARD_MEMBERS_BOARD_USER"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_BOARD_MEMBERS_USER_JOINED"`,
    );
    await queryRunner.query(`DROP TABLE "board_members"`);
    await queryRunner.query(`DROP TYPE "public"."board_members_role_enum"`);
    await queryRunner.query(`DROP TABLE "board_documents"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_BOARDS_HOST"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_BOARDS_CODE"`);
    await queryRunner.query(`DROP TABLE "boards"`);
    await queryRunner.query(`DROP TYPE "public"."boards_language_enum"`);
  }
}
