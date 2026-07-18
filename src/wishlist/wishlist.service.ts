import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Wishlist, WishlistDocument } from './wishlist.schema';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name)
    private wishlistModel: Model<WishlistDocument>,
  ) {}

  async addToWishlist(userId: string, productId: string) {
    const exists = await this.wishlistModel.findOne({
      user: new Types.ObjectId(userId),
      product: new Types.ObjectId(productId),
    });

    if (exists) {
      throw new BadRequestException('Product already in wishlist');
    }

    const wishlist = await this.wishlistModel.create({
      user: new Types.ObjectId(userId),
      product: new Types.ObjectId(productId),
    });

    return {
      message: 'Product added to wishlist',
      wishlist,
    };
  }

  async getMyWishlist(userId: string) {
    return this.wishlistModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'product',
        populate: {
          path: 'category',
        },
      })
      .sort({ createdAt: -1 });
  }

  async removeFromWishlist(userId: string, productId: string) {
    const deleted = await this.wishlistModel.findOneAndDelete({
      user: new Types.ObjectId(userId),
      product: new Types.ObjectId(productId),
    });

    if (!deleted) {
      throw new NotFoundException('Wishlist product not found');
    }

    return {
      message: 'Product removed from wishlist',
    };
  }
}