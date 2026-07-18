import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { SendPhoneOtpDto } from './dto/send-phone-otp.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.googleLogin(googleLoginDto);
  }

  @Post('phone/send-otp')
  sendPhoneOtp(@Body() sendPhoneOtpDto: SendPhoneOtpDto) {
    return this.authService.sendPhoneOtp(sendPhoneOtpDto);
  }

  @Post('phone/verify-otp')
  verifyPhoneOtp(@Body() verifyPhoneOtpDto: VerifyPhoneOtpDto) {
    return this.authService.verifyPhoneOtp(verifyPhoneOtpDto);
  }

  @Post('admin-login')
  adminLogin(@Body() adminLoginDto: AdminLoginDto) {
    return this.authService.adminLogin(adminLoginDto);
  }
}
