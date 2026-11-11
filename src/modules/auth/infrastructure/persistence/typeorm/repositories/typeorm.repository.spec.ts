jest.mock('@nestjs/typeorm', () => ({
  InjectDataSource: () => () => undefined,
}));
import type { DataSource } from 'typeorm';
import { TypeOrmRepository } from './typeorm.repository';
describe('TypeOrmRepository', () => {
  it('conserva el DataSource inyectado para transacciones', () => {
    const source = { transaction: jest.fn() } as unknown as DataSource;
    expect(new TypeOrmRepository(source).getDataSource()).toBe(source);
  });
});
