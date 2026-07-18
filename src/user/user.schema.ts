import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  })
  email?: string;

  @Prop()
  password?: string;

  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ unique: true, sparse: true, trim: true })
  phone?: string;

  @Prop({ default: false })
  isPhoneVerified!: boolean;

  @Prop()
  profileImage?: string;

  @Prop({
    type: [String],
    enum: ['local', 'google', 'phone'],
    default: ['local'],
  })
  authProviders!: string[];

  @Prop({
    default: 'customer',
    enum: [
      'customer',
      'super_admin',
      'inventory_manager',
      'order_manager',
      'customer_support',
    ],
  })
  role!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
