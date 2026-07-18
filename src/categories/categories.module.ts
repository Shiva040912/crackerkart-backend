import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { Category, CategorySchema } from './category.schema';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
    SocketModule,
  ],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}