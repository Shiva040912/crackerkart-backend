import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Cart, CartDocument } from './cart.schema';
import { Product, ProductDocument } from '../product/product.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private cartModel: Model<CartDocument>,

    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  async addToCart(userId: string, dto: AddToCartDto) {
    const product = await this.productModel.findById(dto.productId);

    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    

    const existingCartItem = await this.cartModel.findOne({
      user: userId,
      product: dto.productId,
    });

    if (existingCartItem) {
      existingCartItem.quantity += dto.quantity;
      await existingCartItem.save();

      return {
        message: 'Cart quantity updated',
        cart: existingCartItem,
      };
    }

    const cart = await this.cartModel.create({
      user: userId,
      product: dto.productId,
      quantity: dto.quantity,
    });

    return {
      message: 'Product added to cart',
      cart,
    };
  }

  async getMyCart(userId: string) {
    return this.cartModel
      .find({ user: userId })
      .populate('product')
      .sort({ createdAt: -1 });
  }

  async updateCartItem(userId: string, cartId: string, dto: UpdateCartDto) {
    const cartItem = await this.cartModel.findOne({
      _id: cartId,
      user: userId,
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    cartItem.quantity = dto.quantity;
    await cartItem.save();

    return {
      message: 'Cart item updated',
      cart: cartItem,
    };
  }

  async removeCartItem(userId: string, cartId: string) {
    const cartItem = await this.cartModel.findOneAndDelete({
      _id: cartId,
      user: userId,
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    return {
      message: 'Cart item removed',
    };
  }

  async clearCart(userId: string) {
    await this.cartModel.deleteMany({ user: userId });

    return {
      message: 'Cart cleared',
    };
  }
}
