import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { DataSource, Repository } from "typeorm";
import appConfig from "src/app.config";
import { OptionEntity } from "../entities/option.entity";
import { TypeOrmRepository } from "./typeorm.repository";

@Injectable()
export class OptionTypeOrmRepository extends TypeOrmRepository {
    private readonly optionRepository: Repository<OptionEntity>

    constructor(@InjectDataSource(appConfig.postgres_connectionName) dataSource: DataSource) {
        super(dataSource);
        this.optionRepository = dataSource.manager.getRepository(OptionEntity);
    }
    
    async search(logId: string): Promise<OptionEntity[]> {
        Logger.log(`[${logId}] ProfileRepository.search`);
        try {
            return await this.optionRepository.find();
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to check for the existence of the profile.', error, logId);
        }        
    }

    async searchActive(logId: string): Promise<OptionEntity[]> {
        Logger.log(`[${logId}] ProfileRepository.search`);
        try {
            return await this.optionRepository.find({ where: { isActive: true }});
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to check for the existence of the profile.', error, logId);
        }        
    }
}