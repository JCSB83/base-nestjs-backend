import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateOptionTableMigration1763596800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'auth_option',
        columns: [
          {
            name: 'option_id',
            type: 'int',
            isPrimary: true,
            isNullable: false,
            primaryKeyConstraintName: 'auth_option_pk',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('auth_option');
  }
}
