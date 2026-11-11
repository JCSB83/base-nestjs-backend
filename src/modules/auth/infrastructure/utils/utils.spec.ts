jest.mock('node:crypto', () => ({ randomUUID: jest.fn() }));
import { randomUUID } from 'node:crypto';
import { Utils } from './utils';
describe('Auth Utils', () => {
  afterEach(() => jest.restoreAllMocks());
  it('obtiene el identificador desde randomUUID', () => {
    jest
      .mocked(randomUUID)
      .mockReturnValue('00000000-0000-4000-8000-000000000000');
    expect(Utils.generateJti()).toBe('00000000-0000-4000-8000-000000000000');
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });
  it('codifica UTF-8 y convierte el digest a hexadecimal de dos digitos', async () => {
    const digest = jest
      .spyOn(crypto.subtle, 'digest')
      .mockResolvedValue(new Uint8Array([0, 1, 15, 16, 255]).buffer);
    await expect(Utils.createHash('contrase?a')).resolves.toBe('00010f10ff');
    expect(digest).toHaveBeenCalledWith(
      'SHA-256',
      new TextEncoder().encode('contrase?a'),
    );
  });
  it('propaga fallos del proveedor criptografico', async () => {
    const error = new Error('crypto unavailable');
    jest.spyOn(crypto.subtle, 'digest').mockRejectedValue(error);
    await expect(Utils.createHash('text')).rejects.toBe(error);
  });
});
