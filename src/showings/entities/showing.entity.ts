import { ApiProperty } from '@nestjs/swagger';

/** Internal representation stored in ShowingsService. */
export interface Showing {
  id: string;
  filmId: string;
  hallId: string;
  /** Normalized ISO 8601 string in UTC (Date#toISOString()). */
  startsAt: string;
  /** Price per seat in kopecks. */
  price: number;
}

/** Public response shape: film title and hall name instead of their ids. */
export class ShowingView {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Interstellar' })
  filmTitle: string;

  @ApiProperty({ example: 'Red Hall' })
  hallName: string;

  @ApiProperty({
    example: '2030-01-15T18:00:00.000Z',
    description: 'ISO 8601, normalized to UTC',
  })
  startsAt: string;

  @ApiProperty({ example: 15000, description: 'Price per seat in kopecks' })
  price: number;
}

export class SeatStatus {
  @ApiProperty({ example: 1 })
  row: number;

  @ApiProperty({ example: 1 })
  seat: number;

  @ApiProperty({ example: false })
  isBooked: boolean;
}
