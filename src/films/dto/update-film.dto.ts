import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsDefinedIfPresent } from '../../common/validators/is-defined-if-present.decorator';
import { MAX_RELEASE_YEAR, MIN_RELEASE_YEAR } from './create-film.dto';

/** Any subset of film fields. Absent fields are kept, null is rejected. */
export class UpdateFilmDto {
  @ApiPropertyOptional({ example: 'Interstellar (IMAX)', maxLength: 200 })
  @IsDefinedIfPresent()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 170, minimum: 1 })
  @IsDefinedIfPresent()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: 2014,
    minimum: MIN_RELEASE_YEAR,
    maximum: MAX_RELEASE_YEAR,
  })
  @IsDefinedIfPresent()
  @IsInt()
  @Min(MIN_RELEASE_YEAR)
  @Max(MAX_RELEASE_YEAR)
  releaseYear?: number;
}
