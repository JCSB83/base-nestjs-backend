import { GetUsertUseCase } from './getUser.use-case';
import { UserDto } from '../dto/user.dto';
describe('GetUsertUseCase', () => {
  const useCase = new GetUsertUseCase();
  it('transforma el usuario en UserDto sin modificar la entrada', () => {
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
      permissions: ['read'],
    };
    const result = useCase.execute(user);
    expect(result).toBeInstanceOf(UserDto);
    expect(result).toEqual(user);
    expect(result).not.toBe(user);
    expect(user).not.toBeInstanceOf(UserDto);
  });
  it('acepta campos opcionales ausentes', () => {
    expect(useCase.execute({ userId: 'user' })).toMatchObject({
      userId: 'user',
      lastName: undefined,
    });
  });
  it('devuelve undefined si no recibe un usuario', () => {
    expect(useCase.execute(undefined)).toBeUndefined();
  });
});
