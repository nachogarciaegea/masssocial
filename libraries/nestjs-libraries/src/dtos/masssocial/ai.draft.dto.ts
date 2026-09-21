import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
} from 'class-validator';

export class AiDraftDto {
  @IsDefined()
  @IsString()
  instruction: string;

  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  integrationIds: string[];

  @IsOptional()
  @IsString()
  projectId?: string;
}
