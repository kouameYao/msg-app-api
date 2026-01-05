import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TasksModule } from './modules/tasks/tasks.module';

@Module({
  imports: [UsersModule, AuthModule, TasksModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
