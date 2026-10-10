import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { formatSeat, Seat, seatKey } from '../common/seat';
import { HallsService } from '../halls/halls.service';
import { SeatStatus } from '../showings/entities/showing.entity';
import { ShowingsService } from '../showings/showings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './entities/booking.entity';

@Injectable()
export class BookingsService {
  private readonly bookings: Booking[] = [];

  constructor(
    private readonly showingsService: ShowingsService,
    private readonly hallsService: HallsService,
  ) {}

  findAll(): Booking[] {
    return this.bookings.map((b) => this.copy(b));
  }

  findByShowing(showingId: string): Booking[] {
    this.showingsService.getEntity(showingId); // 404 if missing
    return this.bookings
      .filter((b) => b.showingId === showingId)
      .map((b) => this.copy(b));
  }

  /**
   * All-or-nothing: every seat is checked (bounds, occupancy) before anything
   * is stored, so a failing request books no seats at all.
   */
  create(showingId: string, dto: CreateBookingDto): Booking {
    const showing = this.showingsService.getEntity(showingId); // 404
    const hall = this.hallsService.findById(showing.hallId);
    if (!hall) {
      // Cannot normally happen: halls with showings cannot be deleted.
      throw new NotFoundException(`Hall with id ${showing.hallId} not found`);
    }

    const outside = dto.seats.filter(
      (s) => !this.hallsService.isSeatInHall(hall, s),
    );
    if (outside.length > 0) {
      throw new BadRequestException(
        `Seats outside hall "${hall.name}" (${hall.rows} rows × ${hall.seatsPerRow} seats): ${outside.map(formatSeat).join(', ')}`,
      );
    }

    const booked = this.bookedSeatKeys(showingId);
    const taken = dto.seats.filter((s) => booked.has(seatKey(s)));
    if (taken.length > 0) {
      throw new ConflictException(
        `Seats already booked for this showing: ${taken.map(formatSeat).join(', ')}`,
      );
    }

    const booking: Booking = {
      id: randomUUID(),
      showingId,
      seats: dto.seats.map((s) => ({ row: s.row, seat: s.seat })),
      totalPrice: showing.price * dto.seats.length,
    };
    this.bookings.push(booking);
    return this.copy(booking);
  }

  /** Seat map of a showing: every hall seat with its booking status. */
  getSeatStatuses(showingId: string): SeatStatus[] {
    const showing = this.showingsService.getEntity(showingId); // 404
    const hall = this.hallsService.findById(showing.hallId);
    if (!hall) {
      throw new NotFoundException(`Hall with id ${showing.hallId} not found`);
    }
    const booked = this.bookedSeatKeys(showingId);
    return this.hallsService
      .computeSeats(hall)
      .map((s) => ({ ...s, isBooked: booked.has(seatKey(s)) }));
  }

  remove(id: string): void {
    const index = this.bookings.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new NotFoundException(`Booking with id ${id} not found`);
    }
    this.bookings.splice(index, 1);
  }

  private bookedSeatKeys(showingId: string): Set<string> {
    const keys = new Set<string>();
    for (const booking of this.bookings) {
      if (booking.showingId !== showingId) continue;
      booking.seats.forEach((s: Seat) => keys.add(seatKey(s)));
    }
    return keys;
  }

  private copy(booking: Booking): Booking {
    return { ...booking, seats: booking.seats.map((s) => ({ ...s })) };
  }
}
