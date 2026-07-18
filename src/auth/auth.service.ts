import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import twilio, { Twilio } from 'twilio';

import { UsersService } from '../user/users.service';
import { EmployeeService } from '../employee/employee.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { SendPhoneOtpDto } from './dto/send-phone-otp.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';

@Injectable()
export class AuthService {
  private readonly googleClient = new OAuth2Client();

  private readonly twilioClient: Twilio;
  private readonly twilioVerifyServiceSid: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly employeeService: EmployeeService,
    private readonly jwtService: JwtService,
  ) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();

    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

    if (!accountSid || !authToken || !verifyServiceSid) {
      throw new Error('Twilio environment variables are not configured');
    }

    this.twilioClient = twilio(accountSid, authToken);

    this.twilioVerifyServiceSid = verifyServiceSid;
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.createUser(registerDto);

    return {
      message: 'Customer registered successfully',
      user,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateLoginResponse(user, 'Login successful');
  }

  async adminLogin(adminLoginDto: AdminLoginDto) {
    const employee = await this.employeeService.findByEmail(
      adminLoginDto.email,
    );

    if (!employee) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      adminLoginDto.password,
      employee.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: employee._id,
      email: employee.email,
      department: employee.department,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      message: 'Login successful',
      access_token: token,
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        age: employee.age,
        department: employee.department,
      },
    };
  }
  async googleLogin(googleLoginDto: GoogleLoginDto) {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      throw new InternalServerErrorException(
        'Google Client ID is not configured',
      );
    }

    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleLoginDto.credential,
        audience: googleClientId,
      });

      const googleUser = ticket.getPayload();

      if (
        !googleUser?.sub ||
        !googleUser.email ||
        !googleUser.name ||
        !googleUser.email_verified
      ) {
        throw new UnauthorizedException('Invalid Google account');
      }

      const user = await this.usersService.findOrCreateGoogleUser({
        googleId: googleUser.sub,
        name: googleUser.name,
        email: googleUser.email,
        profileImage: googleUser.picture,
      });

      return this.generateLoginResponse(user, 'Google login successful');
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async sendPhoneOtp(sendPhoneOtpDto: SendPhoneOtpDto) {
    const cleanedPhone = this.getCleanIndianPhone(sendPhoneOtpDto.phone);

    const phoneWithCountryCode = `+91${cleanedPhone}`;

    try {
      const verification = await this.twilioClient.verify.v2
        .services(this.twilioVerifyServiceSid)
        .verifications.create({
          to: phoneWithCountryCode,
          channel: 'sms',
        });

      if (verification.status !== 'pending') {
        throw new InternalServerErrorException(
          'Unable to start OTP verification',
        );
      }

      return {
        message: 'OTP sent successfully via SMS',
        phone: phoneWithCountryCode,
      };
    } catch (error: any) {
      console.error('Twilio send OTP error:', {
        code: error?.code,
        status: error?.status,
        message: error?.message,
        moreInfo: error?.moreInfo,
      });

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      if (error?.status === 429 || error?.code === 20429) {
        throw new HttpException(
          'Too many OTP requests. Please wait and try again',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (
        error?.code === 60200 ||
        error?.code === 60205 ||
        error?.status === 400
      ) {
        throw new BadRequestException(
          error?.message || 'Unable to send OTP to this phone number',
        );
      }

      throw new InternalServerErrorException(
        'OTP service is currently unavailable',
      );
    }
  }

  async verifyPhoneOtp(verifyPhoneOtpDto: VerifyPhoneOtpDto) {
    const cleanedPhone = this.getCleanIndianPhone(verifyPhoneOtpDto.phone);

    const cleanedOtp = String(verifyPhoneOtpDto.otp || '').replace(/\D/g, '');

    const phoneWithCountryCode = `+91${cleanedPhone}`;

    try {
      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.twilioVerifyServiceSid)
        .verificationChecks.create({
          to: phoneWithCountryCode,
          code: cleanedOtp,
        });

      if (verificationCheck.status !== 'approved') {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      const user = await this.usersService.findOrCreatePhoneUser({
        phone: phoneWithCountryCode,
      });

      return this.generateLoginResponse(user, 'Phone login successful');
    } catch (error: any) {
      console.error('Twilio verify OTP error:', {
        code: error?.code,
        status: error?.status,
        message: error?.message,
        moreInfo: error?.moreInfo,
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error?.status === 429 || error?.code === 20429) {
        throw new HttpException(
          'Too many verification attempts. Please wait and try again',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (
        error?.code === 20404 ||
        error?.code === 60202 ||
        error?.code === 60203 ||
        error?.code === 60204
      ) {
        throw new UnauthorizedException('Invalid or expired OTP');
      }

      throw new InternalServerErrorException(
        'OTP verification service is currently unavailable',
      );
    }
  }

  private getCleanIndianPhone(phone: string) {
    let cleanedPhone = String(phone || '').replace(/\D/g, '');

    if (cleanedPhone.length === 12 && cleanedPhone.startsWith('91')) {
      cleanedPhone = cleanedPhone.slice(2);
    }

    if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
      throw new BadRequestException(
        'Enter a valid 10 digit Indian phone number',
      );
    }

    return cleanedPhone;
  }

  private async generateLoginResponse(user: any, message: string) {
    const payload = {
      sub: user._id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      message,
      access_token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
      },
    };
  }
}
