import { ApiProperty } from '@nestjs/swagger';
import { Seat } from '../../common/seat';

export class Booking {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  showingId: string;

  @ApiProperty({ type: Seat, isArray: true })
  seats: Seat[];

  @ApiProperty({
    example: 30000,
    description: 'Showing price × number of seats, in kopecks',
  })
  totalPrice: number;
}
