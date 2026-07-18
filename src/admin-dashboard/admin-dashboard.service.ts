import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../user/user.schema';
import { Product, ProductDocument } from '../product/product.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/category.schema';
import { Order } from '../order/order.schema';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,

    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
  ) {}

  async getSummary() {
    const [
      totalCustomers,
      totalProducts,
      totalCategories,
      totalOrders,
      stockResult,
      revenueResult,
    ] = await Promise.all([
      this.userModel.countDocuments({
        role: 'customer',
      }),

      this.productModel.countDocuments(),

      this.categoryModel.countDocuments(),

      this.orderModel.countDocuments(),

      this.productModel.aggregate([
        {
          $group: {
            _id: null,
            totalStock: {
              $sum: '$stock',
            },
          },
        },
      ]),

      this.orderModel.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            orderStatus: {
              $ne: 'cancelled',
            },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: '$totalAmount',
            },
          },
        },
      ]),
    ]);

    const lowStockProducts = await this.productModel
      .find({
        stock: {
          $lte: 10,
        },
      })
      .select('name stock brand')
      .sort({
        stock: 1,
      })
      .limit(5);

    const recentOrders = await this.orderModel
      .find()
      .populate('user', 'name email phone')
      .sort({
        createdAt: -1,
      })
      .limit(5);

    return {
      totalCustomers,
      totalProducts,
      totalCategories,
      totalOrders,
      totalStock: stockResult[0]?.totalStock || 0,
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
      lowStockProducts,
      recentOrders,
    };
  }
}