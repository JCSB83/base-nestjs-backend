import { QueryRunner, Table } from 'typeorm';
import { CreateUserTableMigration1763596800003 } from './1763596800003-createUserTable.migration';
describe('CreateUserTableMigration1763596800003', () => {
  let runner: {
    createTable: jest.Mock<Promise<void>, [Table]>;
    dropTable: jest.Mock;
    createPrimaryKey: jest.Mock;
    createForeignKeys: jest.Mock;
  };
  const migration = new CreateUserTableMigration1763596800003();
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
    expect(table.name).toBe('auth_mae_user');
    expect(
      table.columns.find((column) => column.name === 'user_id'),
    ).toMatchObject({ type: 'uuid', isNullable: false, isPrimary: true });
    expect(runner.createForeignKeys).toHaveBeenCalledWith('auth_mae_user', [
      expect.objectContaining({
        columnNames: ['profile_id'],
        referencedTableName: 'auth_mae_profile',
      }),
    ]);
    expect(table.uniques[0].columnNames).toEqual(['email']);
    expect(
      table.columns.find((column) => column.name === 'password'),
    ).toMatchObject({ length: '64', isNullable: false });
  });
  it('revierte la tabla correcta', async () => {
    await migration.down(runner as unknown as QueryRunner);
    expect(runner.dropTable).toHaveBeenCalledWith('auth_mae_user');
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
