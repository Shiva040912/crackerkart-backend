import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Product, ProductDocument } from './product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { Category, CategoryDocument } from '../categories/category.schema';

import { SocketGateway } from '../socket/socket.gateway';

import * as XLSX from 'xlsx';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,

    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,

    private socketGateway: SocketGateway,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const lastProduct = await this.productModel
      .findOne()
      .sort({
        displayOrder: -1,
      })
      .select('displayOrder');

    const nextDisplayOrder = lastProduct
      ? Number(lastProduct.displayOrder || 0) + 1
      : 1;

    const product = await this.productModel.create({
      ...createProductDto,
      displayOrder: nextDisplayOrder,
    });

    this.socketGateway.server.emit('productUpdated');

    return {
      message: 'Product created successfully',
      product,
    };
  }

  async findAll() {
    return this.productModel
      .find()
      .populate('category')
      .sort({
        displayOrder: 1,
        createdAt: 1,
      });
  }

  async findActive(query?: any) {
    const filter: any = {
      isActive: true,
    };

    if (query?.brand) {
      filter.brand = query.brand;
    }

    if (query?.category) {
      filter.category = query.category;
    }

    if (query?.quick === 'under1000') {
      filter.price = {
        $lt: 1000,
      };
    }

    if (query?.quick === 'premium') {
      filter.price = {
        $gte: 1000,
      };
    }

    if (query?.quick === 'bestseller') {
      filter.isBestSeller = true;
    }

    if (query?.quick === 'new') {
      filter.isNewArrival = true;
    }

    if (query?.quick === 'offers') {
      filter.festivalOffer = true;
    }

    return this.productModel
      .find(filter)
      .populate('category')
      .sort({
        displayOrder: 1,
        createdAt: 1,
      });
  }

  async findOne(id: string) {
    const product = await this.productModel
      .findById(id)
      .populate('category');

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productModel.findByIdAndUpdate(
      id,
      updateProductDto,
      {
        new: true,
      },
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    this.socketGateway.server.emit('productUpdated');

    return {
      message: 'Product updated successfully',
      product,
    };
  }

  async remove(id: string) {
    const product = await this.productModel.findByIdAndDelete(id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.normalizeGlobalDisplayOrder();

    this.socketGateway.server.emit('productUpdated');

    return {
      message: 'Product deleted successfully',
    };
  }

  async getBrands() {
    const brands = await this.productModel.distinct('brand', {
      isActive: true,
    });

    return brands.sort();
  }

  async reorder(categoryId: string | undefined, productIds: string[]) {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      throw new BadRequestException('Product IDs are required');
    }

    const uniqueProductIds = [...new Set(productIds)];

    if (uniqueProductIds.length !== productIds.length) {
      throw new BadRequestException('Duplicate product IDs are not allowed');
    }

    await this.normalizeGlobalDisplayOrder();

    /*
     * ALL PRODUCTS REORDER
     *
     * categoryId empty / undefined / "all" na
     * complete global product order update aagum.
     */
    if (!categoryId || categoryId === 'all') {
      const allProducts = await this.productModel
        .find()
        .select('_id')
        .sort({
          displayOrder: 1,
          createdAt: 1,
        });

      if (allProducts.length !== productIds.length) {
        throw new BadRequestException(
          'All products must be included while changing global order',
        );
      }

      const existingProductIds = new Set(
        allProducts.map((product) => product._id.toString()),
      );

      const invalidProduct = productIds.find(
        (productId) => !existingProductIds.has(productId),
      );

      if (invalidProduct) {
        throw new BadRequestException(
          'One or more product IDs are invalid',
        );
      }

      const operations = productIds.map((productId, index) => ({
        updateOne: {
          filter: {
            _id: productId,
          },
          update: {
            $set: {
              displayOrder: index + 1,
            },
          },
        },
      }));

      await this.productModel.bulkWrite(operations);

      this.socketGateway.server.emit('productUpdated');

      return {
        message: 'Global product order updated successfully',
      };
    }

    /*
     * CATEGORY PRODUCTS REORDER
     *
     * Category products existing global positions mattum eduthutu,
     * andha positions-kulla reordered products assign pannum.
     *
     * Idhunaala All Products global order break aagadhu.
     */
    const category = await this.categoryModel.findById(categoryId);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const categoryProducts = await this.productModel
      .find({
        category: categoryId,
      })
      .select('_id displayOrder')
      .sort({
        displayOrder: 1,
        createdAt: 1,
      });

    if (categoryProducts.length !== productIds.length) {
      throw new BadRequestException(
        'All products from the selected category must be included',
      );
    }

    const categoryProductIds = new Set(
      categoryProducts.map((product) => product._id.toString()),
    );

    const invalidCategoryProduct = productIds.find(
      (productId) => !categoryProductIds.has(productId),
    );

    if (invalidCategoryProduct) {
      throw new BadRequestException(
        'Some products do not belong to the selected category',
      );
    }

    const globalPositions = categoryProducts.map(
      (product) => product.displayOrder,
    );

    const operations = productIds.map((productId, index) => ({
      updateOne: {
        filter: {
          _id: productId,
          category: categoryId,
        },
        update: {
          $set: {
            displayOrder: globalPositions[index],
          },
        },
      },
    }));

    await this.productModel.bulkWrite(operations);

    this.socketGateway.server.emit('productUpdated');

    return {
      message: 'Category product order updated successfully',
    };
  }

  downloadBulkUploadTemplate(res: any) {
    const templateData = [
      {
        name: 'Flower Pot',
        description: 'Color Fountain',
        brand: 'Standard',
        category: 'Fountain',
        price: 120,
        originalPrice: 150,
        stock: 50,
        imageUrl: 'https://example.com/product.jpg',
        isBestSeller: false,
        isNewArrival: true,
        isFestivalSpecial: true,
        isActive: true,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=product-bulk-upload-template.xlsx',
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return res.send(excelBuffer);
  }

  async bulkUpload(file: any) {
    if (!file) {
      throw new BadRequestException('Excel or CSV file is required');
    }

    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException(
        'Excel file does not contain a sheet',
      );
    }

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<any>(sheet, {
      defval: '',
    });

    if (!rows.length) {
      throw new BadRequestException(
        'Excel file does not contain product data',
      );
    }

    const products: any[] = [];

    const lastProduct = await this.productModel
      .findOne()
      .sort({
        displayOrder: -1,
      })
      .select('displayOrder');

    let nextDisplayOrder = lastProduct
      ? Number(lastProduct.displayOrder || 0) + 1
      : 1;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;

      if (
        !row.name ||
        row.price === '' ||
        row.stock === '' ||
        !row.category
      ) {
        throw new BadRequestException(
          `Required data missing in row ${rowNumber}`,
        );
      }

      const productName = String(row.name).trim();
      const brandName = String(row.brand || '').trim();
      const categoryName = String(row.category).trim();

      const existingProduct = await this.productModel.findOne({
        name: {
          $regex: `^${this.escapeRegex(productName)}$`,
          $options: 'i',
        },
        brand: {
          $regex: `^${this.escapeRegex(brandName)}$`,
          $options: 'i',
        },
      });

      if (existingProduct) {
        throw new BadRequestException(
          `Product "${productName}" already exists in row ${rowNumber}`,
        );
      }

      const duplicateInExcel = products.find(
        (product) =>
          product.name.toLowerCase() === productName.toLowerCase() &&
          product.brand.toLowerCase() === brandName.toLowerCase(),
      );

      if (duplicateInExcel) {
        throw new BadRequestException(
          `Duplicate product "${productName}" found in Excel row ${rowNumber}`,
        );
      }

      const category = await this.categoryModel.findOne({
        name: {
          $regex: `^${this.escapeRegex(categoryName)}$`,
          $options: 'i',
        },
      });

      if (!category) {
        throw new BadRequestException(
          `Category "${categoryName}" not found in row ${rowNumber}`,
        );
      }

      const price = Number(row.price);
      const stock = Number(row.stock);
      const originalPrice = Number(
        row.originalPrice || row.price,
      );

      if (
        Number.isNaN(price) ||
        Number.isNaN(stock) ||
        Number.isNaN(originalPrice)
      ) {
        throw new BadRequestException(
          `Invalid price or stock in row ${rowNumber}`,
        );
      }

      if (price < 0 || stock < 0 || originalPrice < 0) {
        throw new BadRequestException(
          `Price and stock cannot be negative in row ${rowNumber}`,
        );
      }

      products.push({
        name: productName,
        description: String(row.description || '').trim(),
        brand: brandName,
        imageUrl: String(row.imageUrl || '').trim(),

        price,
        originalPrice,
        stock,

        category: category._id,

        displayOrder: nextDisplayOrder,

        isActive:
          String(row.isActive).trim().toLowerCase() !== 'false',

        isBestSeller:
          String(row.isBestSeller).trim().toLowerCase() === 'true',

        isNewArrival:
          String(row.isNewArrival).trim().toLowerCase() === 'true',

        isFestivalSpecial:
          String(row.isFestivalSpecial).trim().toLowerCase() ===
          'true',
      });

      nextDisplayOrder++;
    }

    const createdProducts =
      await this.productModel.insertMany(products);

    this.socketGateway.server.emit('productUpdated');

    return {
      message: 'Products uploaded successfully',
      totalUploaded: createdProducts.length,
    };
  }

  downloadBulkStockTemplate(res: any) {
    const templateData = [
      {
        name: 'Flower Pot',
        brand: 'Standard',
        stock: 250,
      },
      {
        name: 'Rocket',
        brand: 'Sony',
        stock: 500,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      'Stock Update',
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'buffer',
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=bulk-stock-update-template.xlsx',
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    return res.send(excelBuffer);
  }

  async bulkStockUpdate(file: any) {
    if (!file) {
      throw new BadRequestException(
        'Excel or CSV file is required',
      );
    }

    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
    });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new BadRequestException(
        'Excel file does not contain a sheet',
      );
    }

    const sheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<any>(sheet, {
      defval: '',
    });

    if (!rows.length) {
      throw new BadRequestException(
        'Excel file does not contain stock data',
      );
    }

    let updatedCount = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;

      if (!row.name || row.stock === '') {
        throw new BadRequestException(
          `Product name or stock missing in row ${rowNumber}`,
        );
      }

      const productName = String(row.name).trim();
      const brandName = String(row.brand || '').trim();
      const stock = Number(row.stock);

      if (Number.isNaN(stock) || stock < 0) {
        throw new BadRequestException(
          `Invalid stock value in row ${rowNumber}`,
        );
      }

      const productFilter: any = {
        name: {
          $regex: `^${this.escapeRegex(productName)}$`,
          $options: 'i',
        },
      };

      if (brandName) {
        productFilter.brand = {
          $regex: `^${this.escapeRegex(brandName)}$`,
          $options: 'i',
        };
      }

      const product = await this.productModel.findOneAndUpdate(
        productFilter,
        {
          stock,
        },
        {
          new: true,
        },
      );

      if (!product) {
        throw new BadRequestException(
          `Product "${productName}" not found in row ${rowNumber}`,
        );
      }

      updatedCount++;
    }

    this.socketGateway.server.emit('productUpdated');

    return {
      message: 'Bulk stock updated successfully',
      totalUpdated: updatedCount,
    };
  }

  private async normalizeGlobalDisplayOrder() {
    const products = await this.productModel
      .find()
      .select('_id displayOrder')
      .sort({
        displayOrder: 1,
        createdAt: 1,
      });

    if (!products.length) {
      return;
    }

    const needsNormalization = products.some(
      (product, index) =>
        Number(product.displayOrder || 0) !== index + 1,
    );

    if (!needsNormalization) {
      return;
    }

    const operations = products.map((product, index) => ({
      updateOne: {
        filter: {
          _id: product._id,
        },
        update: {
          $set: {
            displayOrder: index + 1,
          },
        },
      },
    }));

    await this.productModel.bulkWrite(operations);
  }

  private escapeRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}