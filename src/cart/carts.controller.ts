import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { CartService } from './carts.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  addToCart(@Req() req, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(req.user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getMyCart(@Req() req) {
    return this.cartService.getMyCart(req.user.userId);
  }

  @Patch(':cartId')
  @UseGuards(JwtAuthGuard)
  updateCartItem(
    @Req() req,
    @Param('cartId') cartId: string,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateCartItem(req.user.userId, cartId, dto);
  }

  @Delete(':cartId')
  @UseGuards(JwtAuthGuard)
  removeCartItem(@Req() req, @Param('cartId') cartId: string) {
    return this.cartService.removeCartItem(req.user.userId, cartId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  clearCart(@Req() req) {
    return this.cartService.clearCart(req.user.userId);
  }
}