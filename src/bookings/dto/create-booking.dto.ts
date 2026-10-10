import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

export class SeatDto {
  @ApiProperty({ example: 1, minimum: 1, description: '1-based row number' })
  @IsInt()
  @Min(1)
  row: number;

  @ApiProperty({ example: 3, minimum: 1, description: '1-based seat in row' })
  @IsInt()
  @Min(1)
  seat: number;
}

/** Identifier used to detect duplicate seats; tolerant to malformed items. */
function seatIdentifier(item: unknown): string {
  if (item && typeof item === 'object') {
    const { row, seat } = item as Partial<SeatDto>;
    return `${String(row)}:${String(seat)}`;
  }
  return JSON.stringify(item);
}

export class CreateBookingDto {
  @ApiProperty({
    type: SeatDto,
    isArray: true,
    minItems: 1,
    description: 'Seats to book; must be non-empty and without duplicates',
    example: [
      { row: 1, seat: 1 },
      { row: 1, seat: 2 },
    ],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'seats must contain at least one seat' })
  @ArrayUnique(seatIdentifier, {
    message: 'seats must not contain duplicate seats',
  })
  @ValidateNested({ each: true })
  @Type(() => SeatDto)
  seats: SeatDto[];
}
