import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
} from 'class-validator';

export class AdaptDto {
  @IsDefined()
  @IsString()
  content: string;

  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  integrationIds: string[];

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsBoolean()
  useAi?: boolean;
}
