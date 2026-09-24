import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateSessionTableMigration1763596800005 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'auth_session',
                columns: [
                    {
                        name: 'session_id',
                        type: 'uuid',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid',
                        primaryKeyConstraintName: 'auth_session_pk',
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
                        isNullable: false,
                    },
                ],
                foreignKeys: [
                    new TableForeignKey({
                        name: 'auth_session_user_fk',
                        columnNames: ['user_id'],
                        referencedTableName: 'auth_user',
                        referencedColumnNames: ['user_id'],
                    }),
                ],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('auth_session');
    }
}
