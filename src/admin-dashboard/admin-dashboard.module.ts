import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';

import { User, UserSchema } from '../user/user.schema';
import { Product, ProductSchema } from '../product/product.schema';
import { Category, CategorySchema } from '../categories/category.schema';
import { Order, OrderSchema } from '../order/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Product.name,
        schema: ProductSchema,
      },
      {
        name: Category.name,
        schema: CategorySchema,
      },
      {
        name: Order.name,
        schema: OrderSchema,
      },
    ]),
  ],
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService],
})
export class AdminDashboardModule {}
