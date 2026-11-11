import { QueryRunner, Table } from 'typeorm';
import { CreateProfileTableMigration1763596800001 } from './1763596800001-createProfileTable.migration';
describe('CreateProfileTableMigration1763596800001', () => {
  let runner: {
    createTable: jest.Mock<Promise<void>, [Table]>;
    dropTable: jest.Mock;
    createPrimaryKey: jest.Mock;
    createForeignKeys: jest.Mock;
  };
  const migration = new CreateProfileTableMigration1763596800001();
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
    expect(table.name).toBe('auth_mae_profile');
    expect(
      table.columns.find((column) => column.name === 'profile_id'),
    ).toMatchObject({ type: 'uuid', isNullable: false, isPrimary: true });
    expect(table.uniques[0].columnNames).toEqual(['name']);
  });
  it('revierte la tabla correcta', async () => {
    await migration.down(runner as unknown as QueryRunner);
    expect(runner.dropTable).toHaveBeenCalledWith('auth_mae_profile');
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
