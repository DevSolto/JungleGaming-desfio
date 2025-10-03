import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

@Module({
  imports: [
    ConfigModule,
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('AUTH_SERVICE_HOST', '127.0.0.1'),
            port: Number(config.get<number>('AUTH_SERVICE_PORT', 4010)),
          },
        }),
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
