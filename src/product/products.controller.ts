import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Post('bulk-upload')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  bulkUpload(@UploadedFile() file: any) {
    return this.productsService.bulkUpload(file);
  }

  @Post('bulk-stock-update')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor('file'))
  bulkStockUpdate(@UploadedFile() file: any) {
    return this.productsService.bulkStockUpdate(file);
  }

  @Patch('reorder')
  @UseGuards(JwtAuthGuard, AdminGuard)
  reorder(
    @Body()
    body: {
      categoryId: string;
      productIds: string[];
    },
  ) {
    return this.productsService.reorder(
      body.categoryId,
      body.productIds,
    );
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('active')
  findActive(@Query() query: any) {
    return this.productsService.findActive(query);
  }

  @Get('brands')
  getBrands() {
    return this.productsService.getBrands();
  }

  @Get('bulk-upload/template')
  @UseGuards(JwtAuthGuard, AdminGuard)
  downloadBulkUploadTemplate(@Res() res: Response) {
    return this.productsService.downloadBulkUploadTemplate(res);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}