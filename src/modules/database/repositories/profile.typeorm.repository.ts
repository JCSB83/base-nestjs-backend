import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { ProfileEntity } from "../entities/profile.entity";
import { DataSource, Repository } from "typeorm";
import appConfig from "src/app.config";
import { TypeOrmRepository } from "./typeorm.repository";

@Injectable()
export class ProfileTypeOrmRepository extends TypeOrmRepository {
    private readonly profileRepository: Repository<ProfileEntity>

    constructor(@InjectDataSource(appConfig.postgres_connectionName) dataSource: DataSource) {
        super(dataSource);
        this.profileRepository = dataSource.manager.getRepository(ProfileEntity);
    }

    async exists(profileId: string, isActive: boolean, logId: string): Promise<boolean>{
        Logger.log(`[${logId}] ProfileRepository.exists`);
        try {
            const exist = await this.profileRepository.exists({ where: { profileId: profileId, isActive: isActive } });
            return exist;
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to check for the existence of the profile.', error, logId);
        }        
    }
}