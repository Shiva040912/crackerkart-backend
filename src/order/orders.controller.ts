import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @Post('create-payment')
  @UseGuards(JwtAuthGuard)
  createPayment(
    @Req() req: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.ordersService.createPayment(
      req.user.userId,
      dto,
    );
  }

  @Post('verify-payment')
  @UseGuards(JwtAuthGuard)
  verifyPayment(
    @Req() req: any,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.ordersService.verifyPayment(
      req.user.userId,
      dto,
    );
  }

  @Post('test-payment')
  @UseGuards(JwtAuthGuard)
  testPayment(
    @Req() req: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.ordersService.testPayment(
      req.user.userId,
      dto,
    );
  }

  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  getMyOrders(@Req() req: any) {
    return this.ordersService.getMyOrders(
      req.user.userId,
    );
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Patch('admin/:orderId/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body('orderStatus') orderStatus: string,
  ) {
    return this.ordersService.updateOrderStatus(
      orderId,
      orderStatus,
    );
  }

  @Post('admin/:orderId/refund')
  @UseGuards(JwtAuthGuard, AdminGuard)
  processRefund(
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.processRefund(
      orderId,
    );
  }

  @Delete('cancelled/history')
  @UseGuards(JwtAuthGuard)
  deleteCancelledOrders(@Req() req: any) {
    return this.ordersService.deleteCancelledOrders(
      req.user.userId,
    );
  }

  @Patch(':orderId/cancel')
  @UseGuards(JwtAuthGuard)
  cancelOrder(
    @Req() req: any,
    @Param('orderId') orderId: string,
  ) {
    return this.ordersService.cancelOrder(
      req.user.userId,
      orderId,
    );
  }
}