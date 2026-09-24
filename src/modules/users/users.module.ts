import { Logger, Module, OnModuleInit } from "@nestjs/common";
import { UsersController } from "./infrastructure/controllers/users.controller";
import { CreateUserUseCase } from "./application/createUser.usecase";
import { DeleteUserUseCase } from "./application/deleteUser.usecase";
import { readUserUseCase } from "./application/readUser.usecase";
import { SearchUserUseCase } from "./application/searchUser.usecase";
import { UpdateUserUseCase } from "./application/updateUser.usecase";
import { AuthModule } from "../auth/auth.module";
import { USER_REPOSITORY, UsersRepository } from "./infrastructure/repositories/users.repository";
import { DatabaseModule } from "../database/database.module";

@Module({
    imports: [
        DatabaseModule,
        AuthModule
    ],
    controllers: [
        UsersController
    ],
    providers: [
        CreateUserUseCase,
        DeleteUserUseCase,
        readUserUseCase,
        SearchUserUseCase,
        UpdateUserUseCase,
        { provide: USER_REPOSITORY, useClass: UsersRepository }
    ]
})
export class UsersModule implements OnModuleInit {
  onModuleInit() {
    Logger.log('UserModule initialized');
  }
}