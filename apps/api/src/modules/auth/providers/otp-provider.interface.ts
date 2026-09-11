export type OtpPurpose = 'REGISTRATION' | 'LOGIN' | 'PASSWORD_RESET';

export interface SendOtpInput {
  phone: string;
  otp: string;
  purpose: OtpPurpose;
}

export interface SendOtpResult {
  providerMessageId?: string;
  status: string;
}

export interface OtpProvider {
  sendOtp(input: SendOtpInput): Promise<SendOtpResult>;
}

export const OTP_PROVIDER = 'OTP_PROVIDER';
