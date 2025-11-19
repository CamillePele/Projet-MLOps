import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1763475788909 implements MigrationInterface {
    name = 'Migration1763475788909'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "isTraining" boolean NOT NULL, "filename" character varying, "imageUrl" character varying, CONSTRAINT "PK_1fe148074c6a1a91b63cb9ee3c9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "predictions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "model" character varying NOT NULL, "result" jsonb NOT NULL, "imageId" uuid, CONSTRAINT "PK_b92c9e4db595214b289f5e28adc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "predictions" ADD CONSTRAINT "FK_df2e3a813784483634bd788e0f0" FOREIGN KEY ("imageId") REFERENCES "images"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "predictions" DROP CONSTRAINT "FK_df2e3a813784483634bd788e0f0"`);
        await queryRunner.query(`DROP TABLE "predictions"`);
        await queryRunner.query(`DROP TABLE "images"`);
    }

}
