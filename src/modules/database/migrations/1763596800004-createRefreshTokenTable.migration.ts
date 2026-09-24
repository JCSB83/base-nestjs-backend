import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateRefreshTokenTableMigration1763596800004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'auth_user_refresh_token',
        columns: [
          {
            name: 'refresh_token_id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            primaryKeyConstraintName: 'refresh_token_id_pk',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          new TableForeignKey({
            name: 'auth_user_refresh_token_user_fk',
            columnNames: ['user_id'],
            referencedTableName: 'auth_user',
            referencedColumnNames: ['user_id'],
          }),
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('auth_user_refresh_token');
  }
}
