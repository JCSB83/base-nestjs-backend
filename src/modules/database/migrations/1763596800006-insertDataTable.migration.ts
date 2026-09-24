import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { ProfileEntity } from '../entities/profile.entity';
import { ProfileOptionEntity } from '../entities/profileOption.entity';
import { OptionEntity } from '../entities/option.entity';
import { UserEntity } from '../entities/user.entity';
import { Utils } from 'src/modules/shared/utils/utils';

export class InsertDataTableMigration1763596800006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.insert(OptionEntity, [
      { optionId: 1, code: 'USER_CREATE', name: 'User create', description: '', isActive: true },
      { optionId: 2, code: 'USER_READ', name: 'User read', description: '', isActive: true },
      { optionId: 3, code: 'USER_UPDATE', name: 'User update', description: '', isActive: true },
      { optionId: 4, code: 'USER_DELETE', name: 'User delete', description: '', isActive: true },
      { optionId: 5, code: 'USER_SEARCH', name: 'User search', description: '', isActive: true },
      { optionId: 6, code: 'PROFILE_CREATE', name: 'Profile create', description: '', isActive: true },
      { optionId: 7, code: 'PROFILE_READ', name: 'Profile read', description: '', isActive: true },
      { optionId: 8, code: 'PROFILE_UPDATE', name: 'Profile update', description: '', isActive: true },
      { optionId: 9, code: 'PROFILE_DELETE', name: 'Profile delete', description: '', isActive: true },
      { optionId: 10, code: 'PROFILE_SEARCH', name: 'Profile search', description: '', isActive: true },
    ]);

    const result = await queryRunner.manager.insert(ProfileEntity, [
      {
        name: 'admin',
        description: undefined,
        isInternal: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: undefined,
      },
    ]);

    const profileId = result.identifiers[0].profileId;
    await queryRunner.manager.insert(ProfileOptionEntity, [
      { profileId, optionId: 1 },
      { profileId, optionId: 2 },
      { profileId, optionId: 3 },
      { profileId, optionId: 4 },
      { profileId, optionId: 5 },
      { profileId, optionId: 6 },
      { profileId, optionId: 7 },
      { profileId, optionId: 8 },
      { profileId, optionId: 9 },
      { profileId, optionId: 10 },
    ]);

    const password = await Utils.createHash('password123');
    await queryRunner.manager.insert(UserEntity, [
      {
        userName: 'admin',
        password: password,
        firstName: 'Admin',
        middleName: '',
        lastName: '',
        email: 'admin@base.com',
        phone: '55555555',
        isActive: true,
        createdAt: new Date(),
        profileId,
      },
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.deleteAll(OptionEntity);
    await queryRunner.manager.deleteAll(ProfileOptionEntity);
    await queryRunner.manager.deleteAll(ProfileEntity);
    await queryRunner.manager.deleteAll(UserEntity);
  }
}
