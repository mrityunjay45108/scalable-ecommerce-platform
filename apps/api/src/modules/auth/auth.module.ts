import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { OtpService } from './otp.service';
import { OTP_PROVIDER } from './providers/otp-provider.interface';
import { WhatsAppOtpProvider } from './providers/whatsapp-otp.provider';
import { FakeWhatsAppOtpProvider } from './providers/fake-whatsapp-otp.provider';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    OtpService,
    {
      provide: OTP_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const isWhatsAppEnabled = configService.get<boolean>('whatsapp.enabled', false);
        const phoneNumberId = configService.get<string>('whatsapp.phoneNumberId');
        const accessToken = configService.get<string>('whatsapp.accessToken');

        if (isWhatsAppEnabled && phoneNumberId && accessToken) {
          return new WhatsAppOtpProvider(configService);
        }
        return new FakeWhatsAppOtpProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, OtpService, JwtStrategy, PassportModule],
})
export class AuthModule {}

