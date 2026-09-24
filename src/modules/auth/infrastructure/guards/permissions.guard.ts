import { CanActivate, ExecutionContext, Injectable, Logger } from "@nestjs/common";
import { PERMISSIONS_KEY } from "src/common/decorators/permissions.decorator";
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        Logger.log(`[${request.logId}] PermissionsGuard.canActivate`);
        
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [ context.getHandler(), context.getClass() ]);
        if (!requiredPermissions?.length) { 
            return true; 
        }
        const user = request.user;
        if (!user) {
            return false;
        }
        const userPermissions: string[] = user.permissions ?? [];
        return requiredPermissions.every(permission => userPermissions.includes(permission));
    }
}