import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateProfileOptionTableMigration1763596800002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'auth_profile_option',
        columns: [
          {
            name: 'profile_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'option_id',
            type: 'int',
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createPrimaryKey(
      'auth_profile_option',
      ['profile_id', 'option_id'],
      'auth_profile_option_pk',
    );
    await queryRunner.createForeignKeys('auth_profile_option', [
      new TableForeignKey({
        name: 'auth_profile_option_profile_fk',
        columnNames: ['profile_id'],
        referencedTableName: 'auth_profile',
        referencedColumnNames: ['profile_id'],
      }),
      new TableForeignKey({
        name: 'auth_profile_option_option_fk',
        columnNames: ['option_id'],
        referencedTableName: 'auth_option',
        referencedColumnNames: ['option_id'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('auth_profile_option');
  }
}
