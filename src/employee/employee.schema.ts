import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmployeeDocument = Employee & Document;

@Schema({
  timestamps: true,
})
export class Employee {
  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    min: 18,
    max: 65,
  })
  age!: number;

  @Prop({
    required: true,
    unique: true,
    trim: true,
  })
  phone!: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({
    required: true,
  })
  password!: string;

  @Prop({
    required: true,
    enum: [
      'super_admin',
      'admin',
      'inventory',
      'orders',
      'customer_support',
    ],
  })
  department!: string;

  @Prop({
    default: true,
  })
  isActive!: boolean;

  @Prop({
    default: null,
  })
  profileImage?: string;
}

export const EmployeeSchema =
  SchemaFactory.createForClass(Employee);