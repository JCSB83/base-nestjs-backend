import { Utils } from '../../../../src/modules/shared/utils/utils';

describe('Utils.generateLogId', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [0, '00000000'],
    [0.00000001, '00000001'],
    [0.12345678, '12345678'],
    [0.999999999, '99999999'],
  ])('formatea el valor aleatorio %s en ocho dígitos', (random, expected) => {
    jest.spyOn(Math, 'random').mockReturnValue(random);
    expect(Utils.generateLogId()).toBe(expected);
  });
});
