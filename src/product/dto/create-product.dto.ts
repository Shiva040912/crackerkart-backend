import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  brand!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  price!: number;

  @IsNumber()
  stock!: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsString()
  @IsOptional()
  @IsIn(['Single', 'Box', 'Bundle'])
  packType?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  packQuantity?: number;

  @IsString()
  @IsOptional()
  @IsIn(['Piece', 'Pieces', 'Packet', 'Packets'])
  unit?: string;

  @IsBoolean()
  @IsOptional()
  isBestSeller?: boolean;

  @IsBoolean()
  @IsOptional()
  isNewArrival?: boolean;

  @IsBoolean()
  @IsOptional()
  festivalOffer?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  discount?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}