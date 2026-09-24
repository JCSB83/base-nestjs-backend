import { Logger, Module, OnModuleInit } from "@nestjs/common";

@Module({
    
})
export class ProfileModule implements OnModuleInit {
  onModuleInit() {
    Logger.log('ProfileModule initialized');
  }
}