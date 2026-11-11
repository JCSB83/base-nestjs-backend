jest.mock('@nestjs/typeorm', () => ({
  InjectDataSource: () => () => undefined,
}));
import { Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { UserRepository } from './user.repository';
import { OptionRepository } from './option.repository';
import { Utils } from '../../../utils/utils';
describe('UserRepository', () => {
  let findOne: jest.Mock;
  let search: jest.Mock;
  let searchActive: jest.Mock;
  let repo: UserRepository;
  const user = {
    userId: 'user',
    displayName: 'User',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '123',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: undefined,
    profileId: 'profile',
  };
  beforeEach(() => {
    findOne = jest.fn().mockResolvedValue({
      ...user,
      password: 'hidden',
      profile: {
        profileOptions: [{ optionId: 1 }, { optionId: 2 }, { optionId: 3 }],
      },
    });
    const options = [
      { optionId: 1, code: 'read', isActive: true },
      { optionId: 2, code: 'write', isActive: false },
    ];
    search = jest.fn().mockResolvedValue(options);
    searchActive = jest.fn().mockResolvedValue(options);
    repo = new UserRepository(
      {
        manager: { getRepository: () => ({ findOne }) },
      } as unknown as DataSource,
      { search, searchActive } as unknown as OptionRepository,
    );
    jest.spyOn(Utils, 'createHash').mockResolvedValue('hash');
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  describe.each([
    'getUserByUserId',
    'getActiveUserByUserId',
    'getUserByEmailAndPassword',
  ] as const)('%s', (method) => {
    const call = (repo: UserRepository) =>
      method === 'getUserByEmailAndPassword'
        ? repo[method]('email', 'password', 'log')
        : repo[method]('user', 'log');
    it('consulta relaciones, filtra permisos y mapea el dominio', async () => {
      await expect(call(repo)).resolves.toEqual({
        ...user,
        permissions: ['read'],
      });
      expect(findOne).toHaveBeenCalledWith({
        where:
          method === 'getUserByEmailAndPassword'
            ? { email: 'email', password: 'hash' }
            : method === 'getActiveUserByUserId'
              ? { userId: 'user', isActive: true }
              : { userId: 'user' },
        relations: { profile: { profileOptions: true } },
      });
      expect(
        method === 'getActiveUserByUserId' ? search : searchActive,
      ).toHaveBeenCalledWith('log');
      expect(
        method === 'getActiveUserByUserId' ? searchActive : search,
      ).not.toHaveBeenCalled();
    });
    it('devuelve undefined sin consultar permisos si no existe usuario', async () => {
      findOne.mockResolvedValue(null);
      await expect(call(repo)).resolves.toBeUndefined();
      expect(search).not.toHaveBeenCalled();
      expect(searchActive).not.toHaveBeenCalled();
    });
    it.each(['query', 'options'])(
      'conserva causa del error %s',
      async (stage) => {
        const error = new Error('db');
        if (stage === 'query') findOne.mockRejectedValue(error);
        else {
          search.mockRejectedValue(error);
          searchActive.mockRejectedValue(error);
        }
        await expect(call(repo)).rejects.toMatchObject({
          name: 'RepositoryError',
          innerError: error,
        });
      },
    );
  });
  it.each([undefined, null, {}, { profileOptions: [] }])(
    'acepta usuarios sin permisos: %j',
    async (profile: unknown) => {
      findOne.mockResolvedValue({ ...user, profile });
      await expect(repo.getUserByUserId('user', 'log')).resolves.toEqual({
        ...user,
        permissions: [],
      });
    },
  );
  it('no consulta base de datos si falla el hash', async () => {
    const error = new Error('hash failed');
    jest.spyOn(Utils, 'createHash').mockRejectedValue(error);
    await expect(
      repo.getUserByEmailAndPassword('email', 'password', 'log'),
    ).rejects.toMatchObject({ name: 'RepositoryError', innerError: error });
    expect(findOne).not.toHaveBeenCalled();
  });
});
