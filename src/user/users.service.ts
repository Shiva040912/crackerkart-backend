import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from './user.schema';
import { RegisterDto } from '../auth/dto/register.dto';

type GoogleUserData = {
  googleId: string;
  name: string;
  email: string;
  profileImage?: string;
};

type PhoneUserData = {
  phone: string;
  name?: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async createUser(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;

    const normalizedEmail = email
      .toLowerCase()
      .trim();

    const existingUser = await this.userModel.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      throw new ConflictException(
        'Email already registered',
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10,
    );

    const user = await this.userModel.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'customer',
      authProviders: ['local'],
    });

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage: user.profileImage,
    };
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({
      email: email.toLowerCase().trim(),
    });
  }

  async findByPhone(phone: string) {
    return this.userModel.findOne({
      phone: phone.trim(),
    });
  }

  async findOrCreateGoogleUser(
    googleData: GoogleUserData,
  ) {
    const normalizedEmail = googleData.email
      .toLowerCase()
      .trim();

    let user = await this.userModel.findOne({
      email: normalizedEmail,
    });

    if (user) {
      user.googleId = googleData.googleId;

      if (googleData.profileImage) {
        user.profileImage =
          googleData.profileImage;
      }

      if (
        !user.authProviders?.includes('google')
      ) {
        user.authProviders = [
          ...(user.authProviders || ['local']),
          'google',
        ];
      }

      await user.save();

      return user;
    }

    user = await this.userModel.create({
      name: googleData.name.trim(),
      email: normalizedEmail,
      googleId: googleData.googleId,
      profileImage: googleData.profileImage,
      role: 'customer',
      authProviders: ['google'],
    });

    return user;
  }

  async findOrCreatePhoneUser(
    phoneData: PhoneUserData,
  ) {
    const normalizedPhone =
      phoneData.phone.trim();

    let user = await this.userModel.findOne({
      phone: normalizedPhone,
    });

    if (user) {
      user.isPhoneVerified = true;

      if (
        !user.authProviders?.includes('phone')
      ) {
        user.authProviders = [
          ...(user.authProviders || []),
          'phone',
        ];
      }

      await user.save();

      return user;
    }

    const lastFourDigits =
      normalizedPhone.slice(-4);

    user = await this.userModel.create({
      name:
        phoneData.name?.trim() ||
        `Customer ${lastFourDigits}`,
      phone: normalizedPhone,
      isPhoneVerified: true,
      role: 'customer',
      authProviders: ['phone'],
    });

    return user;
  }

  async getAllCustomers() {
    return this.userModel
      .find({
        role: 'customer',
      })
      .select(
        'name email phone profileImage isPhoneVerified authProviders role createdAt',
      )
      .sort({
        createdAt: -1,
      });
  }
}