import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { WhatsappService } from './whatsapp.service';
import { SendWhatsappDto } from './dto/send-whatsapp.dto';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly whatsappService: WhatsappService,
  ) {}

  @Get('status')
  getStatus() {
    return this.whatsappService.getConnectionStatus();
  }

  @Post('send-test')
  sendTestMessage(
    @Body()
    dto: SendWhatsappDto,
  ) {
    return this.whatsappService.sendMessage(
      dto.phone,
      dto.message,
    );
  }

  @Post('send-order-template-test')
  sendOrderTemplateTest(
    @Body()
    body: {
      phone: string;
      customerName: string;
      orderId: string;
      amount: number;
    },
  ) {
    return this.whatsappService.sendOrderConfirmation(
      body.phone,
      body.customerName,
      body.orderId,
      body.amount,
    );
  }
}