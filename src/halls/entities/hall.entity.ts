import { ApiProperty } from '@nestjs/swagger';
import { Seat } from '../../common/seat';

export class Hall {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Red Hall' })
  name: string;

  @ApiProperty({ example: 3, minimum: 1 })
  rows: number;

  @ApiProperty({ example: 5, minimum: 1 })
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
