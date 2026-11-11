import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableUnique,
} from 'typeorm';

export class CreateUserTableMigration1763596800003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'auth_mae_user',
        columns: [
          {
            name: 'user_id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            primaryKeyConstraintName: 'auth_mae_user_pk',
          },
          {
            name: 'display_name',
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
            name: 'last_name',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '320',
            isNullable: false,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '15',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },          
          {
            name: 'profile_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'protected',
            type: 'boolean',
            isNullable: false,
          }
        ],
        uniques: [
          new TableUnique({
            name: 'auth_mae_user_email_uq',
            columnNames: ['email'],
          }),
        ]
      }),
    );

    await queryRunner.createForeignKeys('auth_mae_user', [
      new TableForeignKey({
        name: 'auth_mae_user_profile_fk',
        columnNames: ['profile_id'],
        referencedTableName: 'auth_mae_profile',
        referencedColumnNames: ['profile_id'],
      })
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('auth_mae_user');
  }
}
