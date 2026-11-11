jest.mock('@nestjs/typeorm', () => ({
  InjectDataSource: () => () => undefined,
}));
import { Logger } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import { SessionRepository } from './session.repository';
import { RefreshTokenRepository } from './refreshToken.repository';
import { SessionEntity } from '../entities/session.entity';
import { RefreshTokenEntity } from '../entities/refreshToken.entity';
describe('SessionRepository', () => {
  let db: {
    findOne: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let tx: { save: jest.Mock; delete: jest.Mock };
  let tokens: {
    deleteByJTI: jest.Mock;
    create: jest.Mock;
    searchByUserId: jest.Mock;
    delete: jest.Mock;
  };
  let transaction: jest.Mock;
  let manager: EntityManager;
  let repo: SessionRepository;
  let qb: {
    delete: jest.Mock;
    from: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
  };
  const session = {
    sessionId: 'session',
    userId: 'user',
    jti: 'jti',
    expiresAt: new Date('2030-01-01'),
  };
  const token = {
    userId: 'user',
    jti: 'jti',
    expiresAt: new Date('2030-02-01'),
  };
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    qb = {
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    db = {
      findOne: jest.fn().mockResolvedValue(session),
      find: jest.fn().mockResolvedValue([session]),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    tx = {
      save: jest.fn().mockResolvedValue(session),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    manager = {
      getRepository: jest.fn().mockReturnValue(tx),
    } as unknown as EntityManager;
    transaction = jest.fn(
      async (work: (manager: EntityManager) => Promise<void>) => work(manager),
    );
    tokens = {
      deleteByJTI: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn().mockResolvedValue('refresh'),
      searchByUserId: jest
        .fn()
        .mockResolvedValue([{ refreshTokenId: 'refresh' }]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    repo = new SessionRepository(
      {
        manager: { getRepository: () => db },
        transaction,
      } as unknown as DataSource,
      tokens as unknown as RefreshTokenRepository,
    );
  });
  afterEach(() => jest.restoreAllMocks());
  describe.each(['getSessionById', 'getSessionByJTI'] as const)(
    '%s',
    (method) => {
      it('consulta por identificador y mapea la sesion', async () => {
        db.findOne.mockResolvedValue({ ...session, internal: 'hidden' });
        await expect(repo[method]('id', 'log')).resolves.toEqual(session);
        expect(db.findOne).toHaveBeenCalledWith({
          where:
            method === 'getSessionById' ? { sessionId: 'id' } : { jti: 'id' },
        });
      });
      it('devuelve undefined cuando falta', async () => {
        db.findOne.mockResolvedValue(null);
        await expect(repo[method]('id', 'log')).resolves.toBeUndefined();
      });
      it('envuelve fallo de lectura', async () => {
        const error = new Error('db');
        db.findOne.mockRejectedValue(error);
        await expect(repo[method]('id', 'log')).rejects.toMatchObject({
          name: 'RepositoryError',
          innerError: error,
        });
      });
    },
  );
  it.each([false, true])('lista sesiones, vacio: %s', async (empty) => {
    db.find.mockResolvedValue(
      empty ? [] : [{ ...session, internal: 'hidden' }],
    );
    await expect(repo.getSessionsByUserId('user', 'log')).resolves.toEqual(
      empty ? [] : [session],
    );
    expect(db.find).toHaveBeenCalledWith({ where: { userId: 'user' } });
  });
  it('envuelve fallo al listar', async () => {
    const error = new Error('db');
    db.find.mockRejectedValue(error);
    await expect(repo.getSessionsByUserId('user', 'log')).rejects.toMatchObject(
      { name: 'RepositoryError', innerError: error },
    );
  });
  it.each([undefined, 'old-jti'])(
    'persiste ambos tokens en la misma transaccion, anterior: %s',
    async (previous) => {
      await expect(
        repo.saveSessionAndRefreshToken(previous, session, token, 'log'),
      ).resolves.toBeUndefined();
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(tx.save).toHaveBeenCalledWith(
        Object.assign(new SessionEntity(), {
          userId: 'user',
          jti: 'jti',
          expiresAt: session.expiresAt,
        }),
      );
      expect(tokens.create).toHaveBeenCalledWith(
        Object.assign(new RefreshTokenEntity(), token),
        manager,
        'log',
      );
      if (previous) {
        expect(tx.delete).toHaveBeenCalledWith({ jti: previous });
        expect(tokens.deleteByJTI).toHaveBeenCalledWith(
          previous,
          manager,
          'log',
        );
        expect(tx.delete.mock.invocationCallOrder[0]).toBeLessThan(
          tx.save.mock.invocationCallOrder[0],
        );
      } else {
        expect(tx.delete).not.toHaveBeenCalled();
        expect(tokens.deleteByJTI).not.toHaveBeenCalled();
      }
    },
  );
  it('propaga fallo de creacion de sesion y no crea refresh token', async () => {
    const error = new Error('save');
    tx.save.mockRejectedValue(error);
    await expect(
      repo.saveSessionAndRefreshToken(undefined, session, token, 'log'),
    ).rejects.toMatchObject({ name: 'RepositoryError', innerError: error });
    expect(tokens.create).not.toHaveBeenCalled();
  });
  it('propaga al administrador transaccional el fallo del refresh token', async () => {
    const error = new Error('refresh save');
    tokens.create.mockRejectedValue(error);
    await expect(
      repo.saveSessionAndRefreshToken(undefined, session, token, 'log'),
    ).rejects.toBe(error);
  });
  it('elimina sesiones expiradas con el filtro temporal', async () => {
    await expect(repo.deleteExpiredSessions('log')).resolves.toBeUndefined();
    expect(qb.delete).toHaveBeenCalledTimes(1);
    expect(qb.from).toHaveBeenCalledWith(SessionEntity);
    expect(qb.where).toHaveBeenCalledWith('expires_at <= now()');
    expect(qb.execute).toHaveBeenCalledTimes(1);
  });
  it('envuelve fallo de limpieza', async () => {
    const error = new Error('db');
    qb.execute.mockRejectedValue(error);
    await expect(repo.deleteExpiredSessions('log')).rejects.toMatchObject({
      name: 'RepositoryError',
      innerError: error,
    });
  });
  it('elimina sesion y refresh por JTI en la misma transaccion', async () => {
    await repo.deleteSessionAndRefreshToken('jti', 'log');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(tx.delete).toHaveBeenCalledWith({ jti: 'jti' });
    expect(tokens.deleteByJTI).toHaveBeenCalledWith('jti', manager, 'log');
  });
  it('no elimina refresh si falla la eliminacion de sesion', async () => {
    const error = new Error('delete');
    tx.delete.mockRejectedValue(error);
    await expect(
      repo.deleteSessionAndRefreshToken('jti', 'log'),
    ).rejects.toMatchObject({ name: 'RepositoryError', innerError: error });
    expect(tokens.deleteByJTI).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    'elimina todas las sesiones y refresh del usuario, vacio: %s',
    async (empty) => {
      db.find.mockResolvedValue(
        empty ? [] : [session, { ...session, sessionId: 'second' }],
      );
      tokens.searchByUserId.mockResolvedValue(
        empty
          ? []
          : [{ refreshTokenId: 'first' }, { refreshTokenId: 'second' }],
      );
      await repo.deleteSessionsAndRefreshTokens('user', 'log');
      expect(db.find).toHaveBeenCalledWith({ where: { userId: 'user' } });
      expect(tokens.searchByUserId).toHaveBeenCalledWith('user', 'log');
      expect(tx.delete).toHaveBeenCalledTimes(empty ? 0 : 2);
      expect(tokens.delete).toHaveBeenCalledTimes(empty ? 0 : 2);
      if (!empty) {
        expect(tx.delete).toHaveBeenNthCalledWith(1, 'session');
        expect(tx.delete).toHaveBeenNthCalledWith(2, 'second');
        expect(tokens.delete).toHaveBeenNthCalledWith(
          1,
          'first',
          manager,
          'log',
        );
        expect(tokens.delete).toHaveBeenNthCalledWith(
          2,
          'second',
          manager,
          'log',
        );
      }
    },
  );
  it.each(['search', 'delete'])(
    'envuelve fallo de %s al cerrar todas las sesiones',
    async (stage) => {
      const error = new Error('db');
      (stage === 'search' ? db.find : tx.delete).mockRejectedValue(error);
      await expect(
        repo.deleteSessionsAndRefreshTokens('user', 'log'),
      ).rejects.toMatchObject({ name: 'RepositoryError', innerError: error });
      expect(tokens.delete).not.toHaveBeenCalled();
    },
  );
  it('revoca por sessionId usando su JTI', async () => {
    await repo.deleteSessionBySessionId('session', 'log');
    expect(db.findOne).toHaveBeenCalledWith({
      where: { sessionId: 'session' },
    });
    expect(tx.delete).toHaveBeenCalledWith({ jti: 'jti' });
    expect(tokens.deleteByJTI).toHaveBeenCalledWith('jti', manager, 'log');
  });
  it('revocar una sesion inexistente no inicia transaccion', async () => {
    db.findOne.mockResolvedValue(null);
    await expect(
      repo.deleteSessionBySessionId('missing', 'log'),
    ).resolves.toBeUndefined();
    expect(transaction).not.toHaveBeenCalled();
  });
  it('no inicia transaccion si falla la lectura para revocar', async () => {
    const error = new Error('db');
    db.findOne.mockRejectedValue(error);
    await expect(
      repo.deleteSessionBySessionId('session', 'log'),
    ).rejects.toMatchObject({ name: 'RepositoryError', innerError: error });
    expect(transaction).not.toHaveBeenCalled();
  });
});
