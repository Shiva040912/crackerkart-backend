import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class SendWhatsappDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message:
      'Enter a valid 10 digit Indian phone number',
  })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, {
    message:
      'Message cannot exceed 1000 characters',
  })
  message!: string;
}