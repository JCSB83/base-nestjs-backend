import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthConfig } from '../../auth.config';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authConfig: AuthConfig) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: authConfig.jwtSecret,
        });
    }

    async validate(payload: any) {
        return { userId: payload.sub, username: payload.username };
    }
}
