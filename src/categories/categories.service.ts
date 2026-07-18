import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { SocketGateway } from '../socket/socket.gateway';
import { Category, CategoryDocument } from './category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    private socketGateway: SocketGateway,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const existingCategory = await this.categoryModel.findOne({
      name: createCategoryDto.name,
    });

    if (existingCategory) {
      throw new ConflictException('Category already exists');
    }

    const category = await this.categoryModel.create(createCategoryDto);

    this.socketGateway.server.emit('categoryUpdated');

    return {
      message: 'Category created successfully',
      category,
    };
  }

  async findAll() {
    return this.categoryModel.find().sort({ createdAt: -1 });
  }

  async findOne(id: string) {
    const category = await this.categoryModel.findById(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryModel.findByIdAndUpdate(
      id,
      updateCategoryDto,
      { new: true },
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    this.socketGateway.server.emit('categoryUpdated');

    return {
      message: 'Category updated successfully',
      category,
    };
  }

  async remove(id: string) {
    const category = await this.categoryModel.findByIdAndDelete(id);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    this.socketGateway.server.emit('categoryUpdated');

    return {
      message: 'Category deleted successfully',
    };
  }
}