import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  SendVerificationEmailDto,
  ChangePasswordDto,
  RefreshTokenDto,
  FirebaseLoginDto,
  VerifyWhatsAppOtpDto,
  ResendOtpDto,
  SendEmailOtpDto,
  VerifyEmailOtpDto,
} from './auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Send Email OTP via MojoAuth for passwordless login / signup' })
  @ApiResponse({ status: 200, description: 'OTP sent to email successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sendEmailOtp(@Body() dto: SendEmailOtpDto) {
    const result = await this.authService.sendEmailOtp(dto);
    return {
      success: true,
      message: result.message,
      state_id: result.state_id,
      expiresIn: result.expiresIn,
    };
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify Email OTP via MojoAuth and return JWT tokens' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully and user logged in' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyEmailOtp(
    @Body() dto: VerifyEmailOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmailOtp(dto);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      success: true,
      message: result.message,
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
      isNewUser: result.isNewUser,
    };
  }

  @Public()
  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    };
  }

  @Public()
  @Post('verify-whatsapp-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify WhatsApp OTP and activate account' })
  @ApiResponse({ status: 200, description: 'Account successfully activated and authenticated' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP code' })
  async verifyWhatsAppOtp(
    @Body() dto: VerifyWhatsAppOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyWhatsAppOtp(dto);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    };
  }

  @Public()
  @Post('otp/resend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend WhatsApp OTP code with 60s cooldown' })
  @ApiResponse({ status: 200, description: 'New verification code sent to WhatsApp' })
  @ApiResponse({ status: 429, description: 'Cooldown period active' })
  async resendOtp(@Body() dto: ResendOtpDto) {
    const result = await this.authService.resendOtp(dto);
    return {
      success: true,
      message: result.message,
      data: {
        verificationId: result.verificationId,
        expiresIn: result.expiresIn,
        resendAfter: result.resendAfter,
        phone: result.phone,
      },
    };
  }


  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive account' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    };
  }

  @Public()
  @Post('firebase-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in or register with Firebase OAuth (Google)' })
  @ApiResponse({ status: 200, description: 'Successfully authenticated with Firebase' })
  async firebaseLogin(
    @Body() dto: FirebaseLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.firebaseLogin(dto);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token with token rotation' })
  @ApiResponse({ status: 200, description: 'Tokens successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'] || dto?.refreshToken || req.body?.refreshToken;
    const result = await this.authService.refreshTokens(refreshToken);
    this.setRefreshTokenCookie(res, result.tokens.refreshToken);
    return {
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Log out and revoke refresh token' })
  async logout(
    @Req() req: Request,
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refreshToken'];
    await this.authService.logout(refreshToken, userId);
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request a password reset link' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password using token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('send-verification-email')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Resend email verification link' })
  async sendVerificationEmail(
    @CurrentUser('id') userId: string,
    @Body() dto: SendVerificationEmailDto,
  ) {
    return this.authService.sendVerificationEmail(userId, dto.email);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get currently authenticated user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
