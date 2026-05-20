import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserName1779267545710 implements MigrationInterface {
    name = 'AddUserName1779267545710'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
    }

}
