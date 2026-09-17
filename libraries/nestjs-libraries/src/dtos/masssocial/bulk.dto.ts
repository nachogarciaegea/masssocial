import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// Fila de entrada (CSV/XLSX o planificador de lotes)
export class BulkRowInputDto {
  @IsDefined()
  @IsNumber()
  index: number;

  @IsOptional()
  @IsString()
  fecha?: string;

  @IsOptional()
  @IsString()
  hora?: string;

  @IsOptional()
  @IsString()
  zona_horaria?: string;

  @IsOptional()
  @IsString()
  proyecto?: string;

  @IsOptional()
  @IsString()
  redes?: string;

  @IsOptional()
  @IsString()
  texto?: string;

  @IsOptional()
  @IsString()
  medios?: string;

  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  tablero?: string;

  @IsOptional()
  @IsString()
  repetir_dias?: string;

  @IsOptional()
  @IsString()
  etiquetas?: string;

  @IsOptional()
  @IsString()
  borrador?: string;

  @IsOptional()
  @IsString()
  adaptar?: string;
}

export class BulkPreviewDto {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkRowInputDto)
  rows: BulkRowInputDto[];
}

export class BulkTargetDto {
  @IsDefined()
  @IsString()
  integrationId: string;

  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsString()
  identifier: string;

  @IsOptional()
  @IsString()
  picture?: string;

  @IsDefined()
  @IsString()
  content: string;

  @IsDefined()
  @IsObject()
  settings: Record<string, any>;

  @IsDefined()
  @IsNumber()
  maxLength: number;

  @IsDefined()
  @IsBoolean()
  truncated: boolean;
}

export class BulkMediaDto {
  @IsDefined()
  @IsString()
  id: string;

  @IsDefined()
  @IsString()
  path: string;

  @IsDefined()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;
}

export class BulkProjectRefDto {
  @IsDefined()
  @IsString()
  id: string;

  @IsDefined()
  @IsString()
  name: string;
}

export class BulkRowPreviewDto {
  @IsDefined()
  @IsNumber()
  index: number;

  @IsDefined()
  @IsString()
  date: string;

  @IsOptional()
  @IsNumber()
  inter?: number;

  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsDefined()
  @IsBoolean()
  draft: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => BulkProjectRefDto)
  project?: BulkProjectRefDto;

  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkMediaDto)
  media: BulkMediaDto[];

  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkTargetDto)
  targets: BulkTargetDto[];

  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  errors: string[];

  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  warnings: string[];

  @IsDefined()
  @IsObject()
  raw: Record<string, string>;
}

export class BulkCommitDto {
  @IsDefined()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkRowPreviewDto)
  rows: BulkRowPreviewDto[];
}

export class BulkPlanItemDto {
  @IsDefined()
  @IsString()
  content: string;

  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  mediaIds: string[];

  @IsOptional()
  @IsString()
  title?: string;
}

export class BulkPlanDto {
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkPlanItemDto)
  items: BulkPlanItemDto[];

  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  integrationIds: string[];

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsDefined()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  start: string;

  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @Matches(/^\d{1,2}:\d{2}$/, { each: true })
  timesOfDay: string[];

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  perDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPerNetworkPerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  inter?: number;

  @IsOptional()
  @IsBoolean()
  draft?: boolean;

  @IsOptional()
  @IsBoolean()
  adapt?: boolean;
}
