import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateUserTableMigration1763596800003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'auth_user',
        columns: [
          {
            name: 'user_id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            primaryKeyConstraintName: 'auth_user_pk',
          },
          {
            name: 'user_name',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'password',
            type: 'varchar',
            length: '64',
            isNullable: false,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'middle_name',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '320',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '15',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'profile_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
    );

    await queryRunner.createForeignKeys('auth_user', [
      new TableForeignKey({
        name: 'auth_user_profile_fk',
        columnNames: ['profile_id'],
        referencedTableName: 'auth_profile',
        referencedColumnNames: ['profile_id'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('auth_user');
  }
}
