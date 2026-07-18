import { IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DeliveryAddressDto {
  @IsString()
  fullName!: string;

  @IsString()
  phone!: string;

  @IsString()
  address!: string;

  @IsString()
  city!: string;

  @IsString()
  pincode!: string;
}

export class VerifyPaymentDto {
  @IsString()
  razorpay_order_id!: string;

  @IsString()
  razorpay_payment_id!: string;

  @IsString()
  razorpay_signature!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress!: DeliveryAddressDto;
}