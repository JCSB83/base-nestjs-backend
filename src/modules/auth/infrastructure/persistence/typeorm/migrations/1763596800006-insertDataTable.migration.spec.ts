import { Between, QueryRunner } from 'typeorm';
import { InsertDataTableMigration1763596800006 } from './1763596800006-insertDataTable.migration';
import { ProfileEntity } from '../entities/profile.entity';
import { ProfileOptionEntity } from '../entities/profileOption.entity';
import { UserEntity } from '../entities/user.entity';
import { OptionEntity } from '../entities/option.entity';
import { OptionCode } from '../enums/optionCode.enum';
import { Utils } from '../../../utils/utils';
describe('InsertDataTableMigration', () => {
  let insert: jest.Mock<
    Promise<{ identifiers: { profileId: string }[] }>,
    [unknown, unknown]
  >;
  let remove: jest.Mock;
  let runner: QueryRunner;
  const migration = new InsertDataTableMigration1763596800006();
  beforeEach(() => {
    insert = jest
      .fn<
        Promise<{ identifiers: { profileId: string }[] }>,
        [unknown, unknown]
      >()
      .mockResolvedValue({ identifiers: [{ profileId: 'admin-profile' }] });
    remove = jest.fn().mockResolvedValue({ affected: 1 });
    runner = { manager: { insert, delete: remove } } as unknown as QueryRunner;
    jest.spyOn(Utils, 'createHash').mockResolvedValue('hashed-password');
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01'));
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
  it('crea permisos, perfil y administrador con hash y relaciones correctas', async () => {
    await migration.up(runner);
    expect(insert).toHaveBeenCalledTimes(4);
    const options = insert.mock.calls[0][1] as {
      optionId: number;
      code: string;
      isActive: boolean;
    }[];
    expect(insert.mock.calls[0][0]).toBe(OptionEntity);
    expect(options.map((o) => o.optionId)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(options.map((o) => o.code)).toEqual(Object.values(OptionCode));
    expect(options.every((o) => o.isActive)).toBe(true);
    expect(insert).toHaveBeenNthCalledWith(2, ProfileEntity, [
      expect.objectContaining({
        name: 'admin',
        isInternal: true,
        isActive: true,
        protected: true,
        createdAt: new Date('2026-01-01'),
      }),
    ]);
    expect(insert).toHaveBeenNthCalledWith(
      3,
      ProfileOptionEntity,
      options.map((o) => ({
        profileId: 'admin-profile',
        optionId: o.optionId,
      })),
    );
    expect(insert).toHaveBeenNthCalledWith(4, UserEntity, [
      expect.objectContaining({
        email: 'admin@base.com',
        password: 'hashed-password',
        profileId: 'admin-profile',
        protected: true,
      }),
    ]);
  });
  it('revierte solo datos sembrados respetando dependencias', async () => {
    await migration.down(runner);
    expect(remove).toHaveBeenNthCalledWith(1, ProfileOptionEntity, {
      optionId: Between(1, 10),
    });
    expect(remove).toHaveBeenNthCalledWith(2, OptionEntity, {
      optionId: Between(1, 10),
    });
    expect(remove).toHaveBeenNthCalledWith(3, UserEntity, {
      email: 'admin@base.com',
    });
    expect(remove).toHaveBeenNthCalledWith(4, ProfileEntity, { name: 'admin' });
    expect(remove).toHaveBeenCalledTimes(4);
  });
  it.each([1, 2, 3, 4])(
    'detiene inserciones si falla la etapa %i',
    async (stage) => {
      const error = new Error('insert failed');
      insert.mockReset();
      for (let i = 1; i < stage; i++)
        insert.mockResolvedValueOnce({
          identifiers: [{ profileId: 'profile' }],
        });
      insert.mockRejectedValueOnce(error);
      await expect(migration.up(runner)).rejects.toBe(error);
      expect(insert).toHaveBeenCalledTimes(stage);
    },
  );
  it('no inserta usuario si falla hashing', async () => {
    const error = new Error('hash failed');
    jest.spyOn(Utils, 'createHash').mockRejectedValue(error);
    await expect(migration.up(runner)).rejects.toBe(error);
    expect(insert).toHaveBeenCalledTimes(3);
  });
  it('detiene rollback si falla una eliminacion', async () => {
    const error = new Error('delete failed');
    remove.mockRejectedValue(error);
    await expect(migration.down(runner)).rejects.toBe(error);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
