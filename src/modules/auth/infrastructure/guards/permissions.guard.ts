import { CanActivate, ExecutionContext, ForbiddenException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

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
        const permissionFound = requiredPermissions.every(permission => userPermissions.includes(permission));
        if (!permissionFound) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                logId: request.logId,
                error: 'FORBIDDEN',
                message: 'You do not have permission to perform this operation',
            });
        }
        return true;
    }
}