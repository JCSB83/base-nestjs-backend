import { Injectable, Logger } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { RepositoryError } from "src/modules/shared/errors/repository.error";
import { DataSource, Repository } from "typeorm";
import { OptionEntity } from "../entities/option.entity";
import { TypeOrmRepository } from "./typeorm.repository";
import { AUTH_CONNECTION_NAME } from "src/modules/auth/auth.constants";

@Injectable()
export class OptionRepository extends TypeOrmRepository {
    private readonly optionRepository: Repository<OptionEntity>

    constructor(@InjectDataSource(AUTH_CONNECTION_NAME) dataSource: DataSource) {
        super(dataSource);
        this.optionRepository = dataSource.manager.getRepository(OptionEntity);
    }
    
    async search(logId: string): Promise<OptionEntity[]> {
        Logger.log(`[${logId}] OptionRepository.search`);
        try {
            return await this.optionRepository.find();
        } catch (error: any) {
            throw new RepositoryError('An error occurred while trying to retrieve the options.', error, logId);
        }        
    }

    async searchActive(logId: string): Promise<OptionEntity[]> {
        Logger.log(`[${logId}] OptionRepository.searchActive`);
        try {
            return await this.optionRepository.find({ where: { isActive: true }});
        } catch (error: any) {
            throw new RepositoryError('An error occurred while attempting to retrieve the active options.', error, logId);
        }        
    }
}