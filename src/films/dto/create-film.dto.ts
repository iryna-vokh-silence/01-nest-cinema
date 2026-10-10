import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const MIN_RELEASE_YEAR = 1888;
export const MAX_RELEASE_YEAR = 2100;

export class CreateFilmDto {
  @ApiProperty({ example: 'Interstellar', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 169, minimum: 1, description: 'Positive integer' })
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiProperty({
    example: 2014,
    minimum: MIN_RELEASE_YEAR,
    maximum: MAX_RELEASE_YEAR,
  })
  @IsInt()
  @Min(MIN_RELEASE_YEAR)
  @Max(MAX_RELEASE_YEAR)
  releaseYear: number;
}
