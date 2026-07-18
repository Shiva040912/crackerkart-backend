import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class ChatDto {
  @IsString()
  @IsNotEmpty({
    message:
      'Chat message is required',
  })
  @MaxLength(500, {
    message:
      'Message cannot exceed 500 characters',
  })
  message!: string;
}