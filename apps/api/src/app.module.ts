import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const ttl = parseInt(config.get<string>('RATE_LIMIT_TTL', '1'), 10);
        const limit = parseInt(
          config.get<string>('RATE_LIMIT_LIMIT', '10'),
          10,
        );

        const normalizedTtl = Number.isNaN(ttl) ? 1 : ttl;
        const normalizedLimit = Number.isNaN(limit) ? 10 : limit;

        return [
          {
            ttl: normalizedTtl,
            limit: normalizedLimit,
          },
        ];
      },
    }),
    AuthModule,
    TasksModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
