import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsUUID, Matches, Min } from 'class-validator';

/** Full date-time with an explicit time zone (Z or ±HH:MM). */
const ISO_DATE_TIME_WITH_ZONE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export class CreateShowingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  filmId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  hallId: string;

  @ApiProperty({
    example: '2030-01-15T18:00:00.000Z',
    description:
      'ISO 8601 date-time with time zone (Z or ±HH:MM); must be in the future',
  })
  @IsISO8601(
    { strict: true, strictSeparator: true },
    { message: 'startsAt must be a valid ISO 8601 date-time' },
  )
  @Matches(ISO_DATE_TIME_WITH_ZONE, {
    message:
      'startsAt must be a full ISO 8601 date-time with time zone, e.g. 2030-01-15T18:00:00.000Z',
  })
  startsAt: string;

  @ApiProperty({
    example: 15000,
    minimum: 1,
    description: 'Price per seat in kopecks (positive integer)',
  })
  @IsInt({ message: 'price must be an integer number of kopecks' })
  @Min(1, { message: 'price must be a positive integer (kopecks)' })
  price: number;
}
