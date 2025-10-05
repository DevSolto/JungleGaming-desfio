import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthGatewayService } from './auth-gateway.service';
import { buildRefreshCookieOptions } from './cookie.options';
import { LoginDto, RegisterDto } from './dto';
import type {
  AuthLoginResponse,
  AuthRegisterResponse,
  AuthSessionResponse,
} from '@repo/types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthGatewayService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ description: 'User registered successfully' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    const { user, accessToken, refreshToken } =
      await this.authService.register(dto);

    const cookieOptions = buildRefreshCookieOptions();
    res.cookie('refreshToken', refreshToken, cookieOptions);

    return { user, accessToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User authenticated successfully' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    const { user, accessToken, refreshToken } =
      await this.authService.login(dto);

    const cookieOptions = buildRefreshCookieOptions();
    res.cookie('refreshToken', refreshToken, cookieOptions);

    return { user, accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Access token refreshed successfully' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const refreshToken = this.extractRefreshToken(req);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const { accessToken, refreshToken: rotatedRefreshToken } =
      await this.authService.refresh(refreshToken);

    const cookieOptions = buildRefreshCookieOptions();
    res.cookie('refreshToken', rotatedRefreshToken, cookieOptions);

    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User logged out successfully' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean }> {
    const refreshToken = this.extractRefreshToken(req);

    if (refreshToken) {
      await this.authService.logout(refreshToken).catch(() => undefined);
    }

    const cookieOptions = buildRefreshCookieOptions();
    res.clearCookie('refreshToken', { ...cookieOptions, maxAge: 0 });

    return { success: true };
  }

  private extractRefreshToken(req: Request): string | undefined {
    const token: unknown = req.cookies?.refreshToken;
    return typeof token === 'string' ? token : undefined;
  }
}
