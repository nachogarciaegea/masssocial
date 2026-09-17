import { IsInt, IsOptional, Min, ValidateIf } from 'class-validator';

export class UpdateEvergreenDto {
  // null quita el reciclaje; un número lo activa cada N días
  @IsOptional()
  @ValidateIf((o) => o.intervalInDays !== null)
  @IsInt()
  @Min(1)
  intervalInDays: number | null;
}
