import { getMetadataArgsStorage } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProfileEntity } from './profile.entity';
describe('UserEntity mapping', () => {
  it('relaciona profile con ProfileEntity', () => {
    const metadata = getMetadataArgsStorage();
    const relation = metadata.relations.find(
      (item) => item.target === UserEntity && item.propertyName === 'profile',
    );
    expect(relation).toBeDefined();
    expect((relation!.type as () => unknown)()).toBe(ProfileEntity);
    expect(relation!.options.nullable).toBe(true);
    expect(
      metadata.columns.find(
        (item) =>
          item.target === UserEntity && item.propertyName === 'password',
      )?.options.select,
    ).toBe(false);
  });
});
