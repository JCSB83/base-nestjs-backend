import { QueryRunner, Table } from 'typeorm';
import { CreateRefreshTokenTableMigration1763596800004 } from './1763596800004-createRefreshTokenTable.migration';
describe('CreateRefreshTokenTableMigration1763596800004', () => {
  let runner: {
    createTable: jest.Mock<Promise<void>, [Table]>;
    dropTable: jest.Mock;
    createPrimaryKey: jest.Mock;
    createForeignKeys: jest.Mock;
  };
  const migration = new CreateRefreshTokenTableMigration1763596800004();
  beforeEach(() => {
    runner = {
      createTable: jest
        .fn<Promise<void>, [Table]>()
        .mockResolvedValue(undefined),
      dropTable: jest.fn().mockResolvedValue(undefined),
      createPrimaryKey: jest.fn().mockResolvedValue(undefined),
      createForeignKeys: jest.fn().mockResolvedValue(undefined),
    };
  });
  it('crea tabla con claves y restricciones del modelo', async () => {
    await migration.up(runner as unknown as QueryRunner);
    expect(runner.createTable).toHaveBeenCalledTimes(1);
    const table = runner.createTable.mock.calls[0][0];
    expect(table).toBeInstanceOf(Table);
    expect(table.name).toBe('auth_trn_user_refresh_token');
    expect(
      table.columns.find((column) => column.name === 'refresh_token_id'),
    ).toMatchObject({ type: 'uuid', isNullable: false, isPrimary: true });
    expect(table.foreignKeys[0]).toMatchObject({
      columnNames: ['user_id'],
      referencedTableName: 'auth_mae_user',
      onDelete: 'CASCADE',
    });
    expect(table.columns.find((column) => column.name === 'jti')).toMatchObject(
      { length: '36', isNullable: false },
    );
    expect(
      table.columns.find((column) => column.name === 'expires_at'),
    ).toMatchObject({ type: 'timestamptz', isNullable: false });
  });
  it('revierte la tabla correcta', async () => {
    await migration.down(runner as unknown as QueryRunner);
    expect(runner.dropTable).toHaveBeenCalledWith(
      'auth_trn_user_refresh_token',
    );
    expect(runner.dropTable).toHaveBeenCalledTimes(1);
  });
  it.each(['up', 'down'] as const)('propaga fallos en %s', async (method) => {
    const error = new Error('ddl failed');
    (method === 'up' ? runner.createTable : runner.dropTable).mockRejectedValue(
      error,
    );
    await expect(
      migration[method](runner as unknown as QueryRunner),
    ).rejects.toBe(error);
    expect(runner.createForeignKeys).not.toHaveBeenCalled();
  });
});
