jest.mock('@nestjs/typeorm', () => ({
  InjectDataSource: () => () => undefined,
}));
import { Logger } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import { RefreshTokenRepository } from './refreshToken.repository';
import { RefreshTokenEntity } from '../entities/refreshToken.entity';
describe('RefreshTokenRepository', () => {
  let db: {
    findOne: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let tx: { delete: jest.Mock; save: jest.Mock };
  let manager: EntityManager;
  let repo: RefreshTokenRepository;
  let qb: {
    delete: jest.Mock;
    from: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };
  const token = {
    refreshTokenId: 'id',
    userId: 'user',
    jti: 'jti',
    expiresAt: new Date('2030-01-01'),
  };
  beforeEach(() => {
    qb = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 2 }),
    };
    db = {
      findOne: jest.fn().mockResolvedValue(token),
      find: jest.fn().mockResolvedValue([token]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn().mockResolvedValue(token),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    tx = {
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn().mockResolvedValue(token),
    };
    manager = {
      getRepository: jest.fn().mockReturnValue(tx),
    } as unknown as EntityManager;
    repo = new RefreshTokenRepository({
      manager: { getRepository: () => db },
    } as unknown as DataSource);
  });
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('obtiene el token de dominio sin exponer su identificador de persistencia', async () => {
    await expect(repo.getRefreshTokenByJTI('jti', 'log')).resolves.toEqual({
      userId: 'user',
      jti: 'jti',
      expiresAt: token.expiresAt,
    });
    expect(db.findOne).toHaveBeenCalledWith({ where: { jti: 'jti' } });
  });
  it('devuelve undefined si no existe', async () => {
    db.findOne.mockResolvedValue(null);
    await expect(
      repo.getRefreshTokenByJTI('jti', 'log'),
    ).resolves.toBeUndefined();
  });
  it('busca por usuario', async () => {
    await expect(repo.searchByUserId('user', 'log')).resolves.toEqual([token]);
    expect(db.find).toHaveBeenCalledWith({ where: { userId: 'user' } });
  });
  it('elimina solo tokens expirados', async () => {
    await expect(
      repo.deleteExpiredRefreshTokens('log'),
    ).resolves.toBeUndefined();
    expect(qb.delete).toHaveBeenCalledTimes(1);
    expect(qb.from).toHaveBeenCalledWith(RefreshTokenEntity);
    expect(qb.where).toHaveBeenCalledWith('expires_at <= now()');
    expect(qb.execute).toHaveBeenCalledTimes(1);
  });
  describe.each([false, true])('manager transaccional: %s', (transactional) => {
    it('crea un token y devuelve su id', async () => {
      const selected = transactional ? tx : db;
      const other = transactional ? db : tx;
      await expect(
        repo.create(token, transactional ? manager : undefined, 'log'),
      ).resolves.toBe('id');
      expect(selected.save).toHaveBeenCalledWith(token);
      expect(other.save).not.toHaveBeenCalled();
    });
    it.each(['delete', 'deleteByJTI'] as const)(
      '%s usa el repositorio correcto',
      async (method) => {
        await expect(
          repo[method]('id', transactional ? manager : undefined, 'log'),
        ).resolves.toEqual({ affected: 1 });
        expect((transactional ? tx : db).delete).toHaveBeenCalledWith(
          method === 'delete' ? 'id' : { jti: 'id' },
        );
        expect((transactional ? db : tx).delete).not.toHaveBeenCalled();
      },
    );
  });
  it.each(['lookup', 'search', 'expire', 'create', 'delete', 'deleteByJTI'])(
    'envuelve error de %s',
    async (stage) => {
      const error = new Error('db');
      let result: Promise<unknown>;
      switch (stage) {
        case 'lookup':
          db.findOne.mockRejectedValue(error);
          result = repo.getRefreshTokenByJTI('jti', 'log');
          break;
        case 'search':
          db.find.mockRejectedValue(error);
          result = repo.searchByUserId('user', 'log');
          break;
        case 'expire':
          qb.execute.mockRejectedValue(error);
          result = repo.deleteExpiredRefreshTokens('log');
          break;
        case 'create':
          db.save.mockRejectedValue(error);
          result = repo.create(token, undefined, 'log');
          break;
        default:
          db.delete.mockRejectedValue(error);
          result =
            stage === 'delete'
              ? repo.delete('id', undefined, 'log')
              : repo.deleteByJTI('jti', undefined, 'log');
      }
      await expect(result).rejects.toMatchObject({
        name: 'RepositoryError',
        innerError: error,
      });
    },
  );
});
