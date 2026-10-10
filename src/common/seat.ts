import { ApiProperty } from '@nestjs/swagger';

/** A seat position inside a hall. Both numbers are 1-based. */
export class Seat {
  @ApiProperty({ example: 1, minimum: 1 })
  row: number;

  @ApiProperty({ example: 3, minimum: 1 })
  seat: number;
}

export function seatKey(seat: Seat): string {
  return `${seat.row}:${seat.seat}`;
}

export function formatSeat(seat: Seat): string {
  return `row ${seat.row} seat ${seat.seat}`;
}
