import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  const valid = { email: 'test@example.com', password: 'password' };
  it('acepta datos validos transformados en una instancia', () => {
    const dto = plainToInstance(LoginDto, valid);
    expect(dto).toBeInstanceOf(LoginDto);
    expect(validateSync(dto)).toEqual([]);
  });
  describe.each([
    { field: 'email', max: 320 },
    { field: 'password', max: 64 },
  ] as const)('$field', ({ field, max }) => {
    it('rechaza una propiedad faltante', () => {
      const input: Record<string, unknown> = { ...valid };
      delete input[field];
      const errors = validateSync(plainToInstance(LoginDto, input));
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(field);
      expect(errors[0].constraints).toHaveProperty('isDefined');
    });
    it.each([null, undefined])('rechaza %s', (value: unknown) => {
      const errors = validateSync(
        plainToInstance(LoginDto, { ...valid, [field]: value }),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(field);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      expect(errors[0].constraints).toHaveProperty('isString');
      expect(errors[0].constraints).toHaveProperty('isDefined');
    });
    it('rechaza cadenas vacias mediante IsNotEmpty', () => {
      const errors = validateSync(
        plainToInstance(LoginDto, { ...valid, [field]: '' }),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(field);
      expect(Object.keys(errors[0].constraints ?? {})).toEqual(['isNotEmpty']);
    });
    it.each([123, false, {}, []])(
      'rechaza valores no string sin convertirlos implicitamente: %j',
      (value: unknown) => {
        const dto = plainToInstance(LoginDto, { ...valid, [field]: value });
        expect(dto[field]).toEqual(value);
        const errors = validateSync(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe(field);
        expect(errors[0].constraints).toHaveProperty('isString');
      },
    );
    it.each([null, undefined])(
      'IsDefined sigue activo con skipMissingProperties para %s',
      (value: unknown) => {
        const errors = validateSync(
          plainToInstance(LoginDto, { ...valid, [field]: value }),
          { skipMissingProperties: true },
        );
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe(field);
        expect(Object.keys(errors[0].constraints ?? {})).toEqual(['isDefined']);
      },
    );
    it('acepta una cadena de un caracter', () => {
      expect(
        validateSync(plainToInstance(LoginDto, { ...valid, [field]: 'a' })),
      ).toEqual([]);
    });
    it('acepta exactamente la longitud maxima', () => {
      expect(
        validateSync(
          plainToInstance(LoginDto, { ...valid, [field]: 'a'.repeat(max) }),
        ),
      ).toEqual([]);
    });
    it('rechaza un caracter por encima de MaxLength', () => {
      const errors = validateSync(
        plainToInstance(LoginDto, { ...valid, [field]: 'a'.repeat(max + 1) }),
      );
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe(field);
      expect(Object.keys(errors[0].constraints ?? {})).toEqual(['maxLength']);
    });
  });
  it('informa todas las propiedades faltantes de un objeto vacio', () => {
    const errors = validateSync(plainToInstance(LoginDto, {}));
    expect(errors.map((error) => error.property).sort()).toEqual([
      'email',
      'password',
    ]);
  });
});
