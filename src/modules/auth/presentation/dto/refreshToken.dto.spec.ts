import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RefreshTokenDto } from './refreshToken.dto';

describe('RefreshTokenDto', () => {
  const valid = { token: 'header.payload.signature' };
  it('acepta datos validos transformados en una instancia', () => {
    const dto = plainToInstance(RefreshTokenDto, valid);
    expect(dto).toBeInstanceOf(RefreshTokenDto);
    expect(validateSync(dto)).toEqual([]);
  });
  describe.each([{ field: 'token', max: undefined }] as const)(
    '$field',
    ({ field }) => {
      it('rechaza una propiedad faltante', () => {
        const input: Record<string, unknown> = { ...valid };
        delete input[field];
        const errors = validateSync(plainToInstance(RefreshTokenDto, input));
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe(field);
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
      });
      it.each([null, undefined])('rechaza %s', (value: unknown) => {
        const errors = validateSync(
          plainToInstance(RefreshTokenDto, { ...valid, [field]: value }),
        );
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe(field);
        expect(errors[0].constraints).toHaveProperty('isNotEmpty');
        expect(errors[0].constraints).toHaveProperty('isString');
      });
      it('rechaza cadenas vacias mediante IsNotEmpty', () => {
        const errors = validateSync(
          plainToInstance(RefreshTokenDto, { ...valid, [field]: '' }),
        );
        expect(errors).toHaveLength(1);
        expect(errors[0].property).toBe(field);
        expect(Object.keys(errors[0].constraints ?? {})).toEqual([
          'isNotEmpty',
        ]);
      });
      it.each([123, false, {}, []])(
        'rechaza valores no string sin convertirlos implicitamente: %j',
        (value: unknown) => {
          const dto = plainToInstance(RefreshTokenDto, {
            ...valid,
            [field]: value,
          });
          expect(dto[field]).toEqual(value);
          const errors = validateSync(dto);
          expect(errors).toHaveLength(1);
          expect(errors[0].property).toBe(field);
          expect(errors[0].constraints).toHaveProperty('isString');
        },
      );

      it('acepta una cadena de un caracter', () => {
        expect(
          validateSync(
            plainToInstance(RefreshTokenDto, { ...valid, [field]: 'a' }),
          ),
        ).toEqual([]);
      });
    },
  );
  it('informa todas las propiedades faltantes de un objeto vacio', () => {
    const errors = validateSync(plainToInstance(RefreshTokenDto, {}));
    expect(errors.map((error) => error.property).sort()).toEqual(['token']);
  });
});
