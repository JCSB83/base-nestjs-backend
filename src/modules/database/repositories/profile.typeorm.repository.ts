import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { ProfileEntity } from "../entities/profile.entity";
import { Repository } from "typeorm";
import appConfig from "src/app.config";

@Injectable()
export class ProfileTypeOrmRepository {
    constructor(
        @InjectRepository(ProfileEntity, appConfig.postgres_connectionName)
        private profileRepository: Repository<ProfileEntity>
    ) {}
    
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