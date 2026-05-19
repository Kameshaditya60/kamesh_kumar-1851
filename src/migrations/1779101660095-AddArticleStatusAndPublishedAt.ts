import { MigrationInterface, QueryRunner } from "typeorm";

export class AddArticleStatusAndPublishedAt1779101660095 implements MigrationInterface {
    name = 'AddArticleStatusAndPublishedAt1779101660095'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."articles_status_enum" AS ENUM('DRAFT', 'PUBLISHED')`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "status" "public"."articles_status_enum" NOT NULL DEFAULT 'DRAFT'`);
        await queryRunner.query(`ALTER TABLE "articles" ADD "publishedAt" TIMESTAMP`);
        await queryRunner.query(`CREATE INDEX "IDX_5f0a73d2e1cc0db5557ae257d1" ON "articles" ("status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_5f0a73d2e1cc0db5557ae257d1"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "publishedAt"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."articles_status_enum"`);
    }

}
