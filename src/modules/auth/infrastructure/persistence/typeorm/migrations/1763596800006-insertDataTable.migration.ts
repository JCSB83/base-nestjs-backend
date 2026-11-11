import { Between, MigrationInterface, QueryRunner } from 'typeorm';
import { ProfileEntity } from '../entities/profile.entity';
import { ProfileOptionEntity } from '../entities/profileOption.entity';
import { OptionEntity } from '../entities/option.entity';
import { UserEntity } from '../entities/user.entity';
import { OptionCode } from '../enums/optionCode.enum';
import { Utils } from '../../../utils/utils';

export class InsertDataTableMigration1763596800006 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.manager.insert(OptionEntity, [
            { optionId: 1, code: OptionCode.USER_CREATE, name: 'User create', description: '', isActive: true },
            { optionId: 2, code: OptionCode.USER_READ, name: 'User read', description: '', isActive: true },
            { optionId: 3, code: OptionCode.USER_UPDATE, name: 'User update', description: '', isActive: true },
            { optionId: 4, code: OptionCode.USER_DELETE, name: 'User delete', description: '', isActive: true },
            { optionId: 5, code: OptionCode.USER_SEARCH, name: 'User search', description: '', isActive: true },
            { optionId: 6, code: OptionCode.PROFILE_CREATE, name: 'Profile create', description: '', isActive: true },
            { optionId: 7, code: OptionCode.PROFILE_READ, name: 'Profile read', description: '', isActive: true },
            { optionId: 8, code: OptionCode.PROFILE_UPDATE, name: 'Profile update', description: '', isActive: true },
            { optionId: 9, code: OptionCode.PROFILE_DELETE, name: 'Profile delete', description: '', isActive: true },
            { optionId: 10, code: OptionCode.PROFILE_SEARCH, name: 'Profile search', description: '', isActive: true },
        ]);

        const result = await queryRunner.manager.insert(ProfileEntity, [{
            name: 'admin',
            description: undefined,
            isInternal: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: undefined,
            protected: true
        }]);

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
                displayName: 'admin',
                password: password,
                firstName: 'Admin',
                lastName: '',
                email: 'admin@base.com',
                phone: '55555555',
                isActive: true,
                createdAt: new Date(),
                profileId,
                protected: true
            },
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.manager.delete(ProfileOptionEntity, { optionId: Between(1, 10) });
        await queryRunner.manager.delete(OptionEntity, { optionId: Between(1, 10) });
        await queryRunner.manager.delete(UserEntity, { email: 'admin@base.com' });
        await queryRunner.manager.delete(ProfileEntity, { name: 'admin' });
    }
}
