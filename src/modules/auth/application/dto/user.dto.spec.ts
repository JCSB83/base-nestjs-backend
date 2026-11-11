import 'reflect-metadata';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { UserDto } from './user.dto';

describe('UserDto', () => {
  const fields = [
    'userId',
    'displayName',
    'firstName',
    'lastName',
    'email',
    'phone',
    'isActive',
    'createdAt',
    'updatedAt',
    'profileId',
    'permissions',
  ] as const;
  const user = {
    userId: 'user',
    displayName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    phone: '123',
    isActive: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    profileId: 'profile',
    permissions: ['read', 'write'],
  };

  it('transforma todas las propiedades expuestas sin modificar la entrada', () => {
    const dto = plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });

    expect(dto).toBeInstanceOf(UserDto);
    expect(dto).toEqual(user);
    expect(dto).not.toBe(user);
    expect(user).not.toBeInstanceOf(UserDto);
    expect(Object.keys(dto).sort()).toEqual([...fields].sort());
  });

  it('excluye propiedades sin Expose al solicitar excludeExtraneousValues', () => {
    const input = { ...user, password: 'secret', internalId: 'internal' };
    const dto = plainToInstance(UserDto, input, {
      excludeExtraneousValues: true,
    });

    expect(dto).toEqual(user);
    expect(dto).not.toHaveProperty('password');
    expect(dto).not.toHaveProperty('internalId');
    expect(input.password).toBe('secret');
  });

  it('serializa todas las propiedades Expose con estrategia excludeAll', () => {
    const dto = Object.assign(new UserDto(), user, { password: 'secret' });
    const result = instanceToPlain(dto, { strategy: 'excludeAll' });

    expect(result).toEqual(user);
    expect(Object.keys(result).sort()).toEqual([...fields].sort());
    expect(result).not.toHaveProperty('password');
  });

  it.each(fields)('expone %s como undefined cuando falta', (field) => {
    const input: Record<string, unknown> = { ...user };
    delete input[field];
    const dto = plainToInstance(UserDto, input, {
      excludeExtraneousValues: true,
    });

    expect(dto).toHaveProperty(field, undefined);
    expect(instanceToPlain(dto, { strategy: 'excludeAll' })).toHaveProperty(
      field,
      undefined,
    );
  });

  it.each(fields)(
    'conserva null en %s al transformar y serializar',
    (field) => {
      const dto = plainToInstance(
        UserDto,
        { ...user, [field]: null },
        {
          excludeExtraneousValues: true,
        },
      );

      expect(dto[field]).toBeNull();
      expect(instanceToPlain(dto, { strategy: 'excludeAll' })).toHaveProperty(
        field,
        null,
      );
    },
  );

  it('expone las propiedades de un objeto vacio sin inventar valores', () => {
    const dto = plainToInstance(UserDto, {}, { excludeExtraneousValues: true });

    expect(Object.keys(dto).sort()).toEqual([...fields].sort());
    for (const field of fields) expect(dto[field]).toBeUndefined();
  });

  it('Expose no valida ni convierte valores incompatibles con los tipos declarados', () => {
    const input = {
      userId: 123,
      isActive: 'false',
      createdAt: 'invalid-date',
      permissions: 'read',
    };
    const dto = plainToInstance(UserDto, input, {
      excludeExtraneousValues: true,
    });

    expect(dto).toMatchObject(input);
    expect(instanceToPlain(dto, { strategy: 'excludeAll' })).toMatchObject(
      input,
    );
  });
});
