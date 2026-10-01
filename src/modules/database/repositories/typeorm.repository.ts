import { InjectDataSource } from "@nestjs/typeorm";
import appConfig from "src/app.config";
import { DataSource } from "typeorm";

export class TypeOrmRepository {
    constructor(@InjectDataSource(appConfig.postgres_connectionName)
                protected readonly dataSource: DataSource) {}

    getDataSource(): DataSource {
        return this.dataSource;    
    }
}