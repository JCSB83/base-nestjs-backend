import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Utils } from "src/modules/shared/utils/utils";
import { DeleteExpiredSessionsUseCase } from "../application/use-cases/deletedExpiredSessions.use-case";

@Injectable()
export class DeleteExpiredSessionsCron {
    constructor(private readonly deleteExpiredSessionsUseCase: DeleteExpiredSessionsUseCase) {}
   
    @Cron(CronExpression.EVERY_MINUTE, { waitForCompletion: true })
    async deleteExpiredSessions() {
        const logId = Utils.generateLogId();
        Logger.log(`[${logId}] Deleting expired sessions...`);
        try {
            await this.deleteExpiredSessionsUseCase.execute(logId);
        } catch (error: any) {
            Logger.error('Error occurred while deleting expired sessions:', error);
        }
    }
}