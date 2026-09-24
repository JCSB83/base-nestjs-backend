import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { Repository } from "typeorm";
import appConfig from "src/app.config";
import { OptionEntity } from "../entities/option.entity";

@Injectable()
export class OptionTypeOrmRepository {
    constructor(
        @InjectRepository(OptionEntity, appConfig.postgres_connectionName)
        private readonly optionRepository: Repository<OptionEntity>
    ) {}
    
    async search(logId: string): Promise<OptionEntity[]> {
        Logger.log(`[${logId}] ProfileRepository.search`);
        try {
            return await this.optionRepository.find();
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to check for the existence of the profile.', error, logId);
        }        
    }
}