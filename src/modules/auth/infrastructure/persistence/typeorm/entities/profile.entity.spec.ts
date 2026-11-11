import { getMetadataArgsStorage } from 'typeorm';
import { ProfileEntity } from './profile.entity';
import { ProfileOptionEntity } from './profileOption.entity';
describe('ProfileEntity mapping', () => {
  it('relaciona profileOptions con ProfileOptionEntity', () => {
    const metadata = getMetadataArgsStorage();
    const relation = metadata.relations.find(
      (item) =>
        item.target === ProfileEntity && item.propertyName === 'profileOptions',
    );
    expect(relation).toBeDefined();
    expect((relation!.type as () => unknown)()).toBe(ProfileOptionEntity);
    const entity = { profile: 'inverse-property' };
    expect(
      (relation!.inverseSideProperty as (entity: unknown) => unknown)(entity),
    ).toBe('inverse-property');
  });
});
