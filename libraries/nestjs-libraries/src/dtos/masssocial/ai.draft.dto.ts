import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';

export class AiDraftDto {
  @IsDefined()
  @IsString()
  instruction: string;

  // Opcional: el creador de post permite redactar antes de elegir redes.
  // Sin canales, se devuelve solo el borrador, sin adaptarlo a ninguno.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  integrationIds?: string[];

  @IsOptional()
  @IsString()
  projectId?: string;
}
