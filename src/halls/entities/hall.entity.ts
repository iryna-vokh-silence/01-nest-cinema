import { ApiProperty } from '@nestjs/swagger';
import { Seat } from '../../common/seat';

export class Hall {
  @ApiProperty({
    format: 'uuid',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  id: string;

  @ApiProperty({ example: 'Red Hall' })
  name: string;

  @ApiProperty({ type: 'integer', example: 3, minimum: 1 })
  rows: number;

  @ApiProperty({ type: 'integer', example: 5, minimum: 1 })
  seatsPerRow: number;
}

export class HallWithSeats extends Hall {
  @ApiProperty({
    type: Seat,
    isArray: true,
    description: 'All seats of the hall (rows × seatsPerRow), 1-based',
  })
  seats: Seat[];
}
