import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendPhoneOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Enter a valid 10 digit Indian phone number',
  })
  phone!: string;
}