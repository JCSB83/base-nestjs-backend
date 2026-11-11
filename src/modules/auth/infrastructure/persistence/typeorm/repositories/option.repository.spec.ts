jest.mock('@nestjs/typeorm', () => ({
  InjectDataSource: () => () => undefined,
}));
import { Logger } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { OptionRepository } from './option.repository';
import { OptionEntity } from '../entities/option.entity';
describe('OptionRepository', () => {
  beforeEach(() => {
    jest.spyOn(Logger, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it.each(['search', 'searchActive'] as const)(
    '%s filtra y devuelve las opciones',
    async (method) => {
      const rows = [{ optionId: 1 }];
      const find = jest.fn().mockResolvedValue(rows);
      const getRepository = jest.fn().mockReturnValue({ find });
      const repo = new OptionRepository({
        manager: { getRepository },
      } as unknown as DataSource);
      await expect(repo[method]('log')).resolves.toBe(rows);
      expect(getRepository).toHaveBeenCalledWith(OptionEntity);
      if (method === 'search') expect(find).toHaveBeenCalledWith();
      else expect(find).toHaveBeenCalledWith({ where: { isActive: true } });
    },
  );
  it.each(['search', 'searchActive'] as const)(
    '%s conserva la causa de fallos de persistencia',
    async (method) => {
      const error = new Error('db');
      const find = jest.fn().mockRejectedValue(error);
      const repo = new OptionRepository({
        manager: { getRepository: () => ({ find }) },
      } as unknown as DataSource);
      await expect(repo[method]('log')).rejects.toMatchObject({
        name: 'RepositoryError',
        innerError: error,
      });
    },
  );
});
