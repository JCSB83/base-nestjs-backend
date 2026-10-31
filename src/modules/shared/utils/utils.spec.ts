import Joi from 'joi';
import { Utils } from './utils';
describe('Shared Utils', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each([
    { random: 0, id: '00000000' },
    { random: 0.00000001, id: '00000001' },
    { random: 0.12345678, id: '12345678' },
    { random: 0.999999999, id: '99999999' },
  ])('genera logId de ocho digitos para $random', ({ random, id }) => {
    jest.spyOn(Math, 'random').mockReturnValue(random);
    expect(Utils.generateLogId()).toBe(id);
  });
  it('combina restricciones sin modificar los esquemas originales', () => {
    const a = Joi.object({ name: Joi.string().required() });
    const b = Joi.object({ count: Joi.number().positive().required() });
    const merged = Utils.mergeConfigSchemas(a, b);
    expect(merged.validate({ name: 'name', count: 1 }).error).toBeUndefined();
    expect(merged.validate({ name: 'name' }).error?.details[0].path).toEqual([
      'count',
    ]);
    expect(merged.validate({ count: 1 }).error?.details[0].path).toEqual(['name']);
    expect(
      merged.validate({ name: 'name', count: -1 }).error?.details[0].path,
    ).toEqual(['count']);
    expect(a.validate({ name: 'name' }).error).toBeUndefined();
    expect(b.validate({ count: 1 }).error).toBeUndefined();
  });
  it('devuelve un esquema de objeto vacio cuando no recibe esquemas', () => {
    const schema = Utils.mergeConfigSchemas();
    expect(schema.validate({}).error).toBeUndefined();
    expect(schema.validate('not an object').error).toBeDefined();
  });
  it('propaga conflictos de tipos entre esquemas', () => {
    expect(() =>
      Utils.mergeConfigSchemas(
        Joi.object({ value: Joi.string() }),
        Joi.object({ value: Joi.number() }),
      ),
    ).toThrow();
  });
});
