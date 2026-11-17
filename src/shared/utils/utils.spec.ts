import Joi from 'joi';
import { Utils } from './utils';

describe('Utils', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [0, '00000000'],
    [0.00000001, '00000001'],
    [0.99999999, '99999999'],
  ])('genera un identificador de ocho dígitos para %s', (random, expected) => {
    jest.spyOn(Math, 'random').mockReturnValue(random);
    expect(Utils.generateLogId()).toBe(expected);
  });

  it('combina y conserva las restricciones de todos los esquemas', () => {
    const schema = Utils.mergeConfigSchemas(
      Joi.object({ name: Joi.string().required() }),
      Joi.object({ count: Joi.number().min(1).required() }),
    );
    expect(schema.validate({ name: 'test', count: 1 }).error).toBeUndefined();
    expect(schema.validate({ count: 1 }).error).toBeDefined();
    expect(schema.validate({ name: 'test', count: 0 }).error).toBeDefined();
  });

  it('admite una lista vacía de esquemas', () => {
    expect(Utils.mergeConfigSchemas().validate({}).error).toBeUndefined();
  });

  it('propaga conflictos entre tipos de esquemas', () => {
    expect(() =>
      Utils.mergeConfigSchemas(
        Joi.object({ value: Joi.string() }),
        Joi.object({ value: Joi.number() }),
      ),
    ).toThrow();
  });
});
