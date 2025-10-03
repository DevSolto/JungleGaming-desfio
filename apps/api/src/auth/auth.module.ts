import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGatewayService } from './auth-gateway.service';
import { AUTH_SERVICE } from './auth.constants';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_ACCESS_SECRET',
          config.get<string>('JWT_SECRET', 'secretKey'),
        ),
        signOptions: {
          expiresIn: config.get<string | number>(
            'JWT_ACCESS_EXPIRES',
            config.get<string | number>('JWT_EXPIRES_IN', '15m'),
          ),
        },
      }),
    }),
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
  providers: [AuthGatewayService, JwtAuthGuard],
  exports: [AuthGatewayService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
