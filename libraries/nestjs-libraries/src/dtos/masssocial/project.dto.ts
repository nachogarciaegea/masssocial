import {
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsDefined()
  @IsString()
  @MinLength(1)
  name: string;
}

export class ProjectProfileDto {
  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  hashtags?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultTimes?: string[];

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ProjectChannelsDto {
  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  integrationIds: string[];
}
