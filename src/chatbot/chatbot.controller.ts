import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { ChatbotService } from './chatbot.service';
import { ChatDto } from './dto/chat.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
  ) {}

  @Post('message')
  sendMessage(
    @Body() chatDto: ChatDto,
  ) {
    return this.chatbotService.getReply(
      chatDto.message,
    );
  }
}