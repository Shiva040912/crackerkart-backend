import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';

import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Post()
  addToWishlist(@Req() req, @Body('productId') productId: string) {
    return this.wishlistService.addToWishlist(req.user.userId, productId);
  }

  @Get()
  getMyWishlist(@Req() req) {
    return this.wishlistService.getMyWishlist(req.user.userId);
  }

  @Delete(':productId')
  removeFromWishlist(@Req() req, @Param('productId') productId: string) {
    return this.wishlistService.removeFromWishlist(req.user.userId, productId);
  }
}