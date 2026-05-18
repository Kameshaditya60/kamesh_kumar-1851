import { MigrationInterface, QueryRunner } from "typeorm";

export class AddArticlesAndAuthorRole1778841164458 implements MigrationInterface {
    name = 'AddArticlesAndAuthorRole1778841164458'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "articles" ("id" SERIAL NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "brandId" integer NOT NULL, "authorId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0a6e2c450d83e0b6052c2793334" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_65d9ccc1b02f4d904e90bd76a3" ON "articles" ("authorId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e6e39d09da997d0a04fac70bc0" ON "articles" ("brandId") `);
        await queryRunner.query(`CREATE TABLE "brand_authors" ("id" SERIAL NOT NULL, "brandId" integer NOT NULL, "authorId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ce62157e00dd93e0643567f0abc" UNIQUE ("brandId", "authorId"), CONSTRAINT "PK_f9545cf3809a08ad90efa1e2ee5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'BRAND', 'AUTHOR')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "FK_e6e39d09da997d0a04fac70bc0c" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "articles" ADD CONSTRAINT "FK_65d9ccc1b02f4d904e90bd76a34" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "brand_authors" ADD CONSTRAINT "FK_3b2b1c2c1ce81ece5a239c1bfba" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "brand_authors" ADD CONSTRAINT "FK_0808932182db805ab7714e15013" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "brand_authors" DROP CONSTRAINT "FK_0808932182db805ab7714e15013"`);
        await queryRunner.query(`ALTER TABLE "brand_authors" DROP CONSTRAINT "FK_3b2b1c2c1ce81ece5a239c1bfba"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_65d9ccc1b02f4d904e90bd76a34"`);
        await queryRunner.query(`ALTER TABLE "articles" DROP CONSTRAINT "FK_e6e39d09da997d0a04fac70bc0c"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum_old" AS ENUM('ADMIN', 'BRAND')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`);
        await queryRunner.query(`DROP TABLE "brand_authors"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e6e39d09da997d0a04fac70bc0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_65d9ccc1b02f4d904e90bd76a3"`);
        await queryRunner.query(`DROP TABLE "articles"`);
    }

}
