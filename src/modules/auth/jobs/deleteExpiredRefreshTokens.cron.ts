import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Utils } from "src/modules/shared/utils/utils";
import { DeleteExpiredRefreshTokensUseCase } from "../application/use-cases/deleteExpiredRefreshTokens.use-case";

@Injectable()
export class DeleteExpiredRefreshTokensCron {
    constructor(private readonly deleteExpiredRefreshTokensUseCase: DeleteExpiredRefreshTokensUseCase) {}
    
    @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
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