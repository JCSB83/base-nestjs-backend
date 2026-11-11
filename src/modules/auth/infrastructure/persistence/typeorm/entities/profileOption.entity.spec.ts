import { getMetadataArgsStorage } from 'typeorm';
import { ProfileOptionEntity } from './profileOption.entity';
import { ProfileEntity } from './profile.entity';
describe('ProfileOptionEntity mapping', () => {
  it('relaciona profile con ProfileEntity', () => {
    const metadata = getMetadataArgsStorage();
    const relation = metadata.relations.find(
      (item) =>
        item.target === ProfileOptionEntity && item.propertyName === 'profile',
    );
    expect(relation).toBeDefined();
    expect((relation!.type as () => unknown)()).toBe(ProfileEntity);
    const entity = { profileOptions: 'inverse-property' };
    expect(
      (relation!.inverseSideProperty as (entity: unknown) => unknown)(entity),
    ).toBe('inverse-property');
    expect(relation!.options.nullable).toBe(false);
    expect(
      metadata.joinColumns.find((item) => item.target === ProfileOptionEntity),
    ).toMatchObject({ name: 'profile_id', referencedColumnName: 'profileId' });
  });
});
