import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DeleteExpiredSessionsUseCase } from "../../application/deletedExpiredSessions.usecase";
import { DeleteExpiredRefreshTokensUseCase } from "../../application/deleteExpiredRefreshTokens.usecase";
import { Utils } from "src/modules/shared/utils/utils";

@Injectable()
export class TaskService {
    constructor(private readonly deleteExpiredSessionsUseCase: DeleteExpiredSessionsUseCase,
                private readonly deleteExpiredRefreshTokensUseCase: DeleteExpiredRefreshTokensUseCase) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async deleteExpiredSessions() {
        const logId = Utils.generateLogId();
        Logger.log(`[${logId}] Deleting expired sessions...`);
        try {
            await this.deleteExpiredSessionsUseCase.execute(logId);
        } catch (error: any) {
            Logger.error('Error occurred while deleting expired sessions:', error);
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async deletedExpiredRefreshTokens() {
        const logId = Utils.generateLogId();
        Logger.log(`[${logId}] Deleting expired refresh tokens...`);
        try {
            await this.deleteExpiredRefreshTokensUseCase.execute(logId);
        } catch (error: any) {
            Logger.error('Error occurred while deleting expired refresh tokens:', error);
        }
    }
}