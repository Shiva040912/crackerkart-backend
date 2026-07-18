import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(18)
  @Max(65)
  age!: number;

  @Matches(/^[6-9]\d{9}$/)
  phone!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum([
    'super_admin',
    'admin',
    'inventory',
    'orders',
    'customer_support',
  ])
  department!: string;
}