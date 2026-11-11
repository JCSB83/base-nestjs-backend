jest.mock('@nestjs/passport', () => ({
  PassportStrategy: () =>
    class {
      constructor(options: unknown) {
        mockOptions(options);
      }
    },
}));
jest.mock('passport-jwt', () => ({
  Strategy: class {},
  ExtractJwt: { fromAuthHeaderAsBearerToken: jest.fn(() => mockExtractor) },
}));
const mockOptions = jest.fn();
const mockExtractor = jest.fn();
import { JwtStrategy } from './jwt.strategy';
import { AuthConfig } from '../../auth.config';
describe('JwtStrategy', () => {
  it('configura bearer, secret y comprobacion de expiracion', () => {
    new JwtStrategy({ jwtSecret: 'secret' } as AuthConfig);
    expect(mockOptions).toHaveBeenCalledWith({
      jwtFromRequest: mockExtractor,
      ignoreExpiration: false,
      secretOrKey: 'secret',
    });
  });
  it('mapea exclusivamente la identidad del payload', async () => {
    const strategy = new JwtStrategy({ jwtSecret: 'secret' } as AuthConfig);
    await expect(
      strategy.validate({ sub: 'user', username: 'name', secret: 'hidden' }),
    ).resolves.toEqual({ userId: 'user', username: 'name' });
  });
});
