import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SeatStatus } from '../showings/entities/showing.entity';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking } from './entities/booking.entity';

/**
 * Showing-scoped routes that depend on bookings. They live in the bookings
 * module so that ShowingsModule never needs to depend on BookingsModule.
 */
@ApiTags('bookings')
@Controller('showings/:id')
export class ShowingBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('seats')
  @ApiTags('showings')
  @ApiOperation({ summary: 'Seat map of a showing with booking status' })
  @ApiOkResponse({ type: SeatStatus, isArray: true })
  @ApiBadRequestResponse({ description: 'id is not a UUID' })
  @ApiNotFoundResponse({ description: 'Showing not found' })
  getSeats(@Param('id', ParseUUIDPipe) id: string): SeatStatus[] {
    return this.bookingsService.getSeatStatuses(id);
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Book seats for a showing (all-or-nothing)' })
  @ApiCreatedResponse({ type: Booking, description: 'Booking created' })
  @ApiBadRequestResponse({
    description:
      'Empty array, invalid/non-positive numbers, duplicate seat, or seat outside the hall',
  })
  @ApiNotFoundResponse({ description: 'Showing not found' })
  @ApiConflictResponse({
    description: 'At least one seat is already booked; nothing is booked',
  })
  create(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBookingDto,
  ): Booking {
    return this.bookingsService.create(id, dto);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'List bookings of a showing' })
  @ApiOkResponse({ type: Booking, isArray: true })
  @ApiBadRequestResponse({ description: 'id is not a UUID' })
  @ApiNotFoundResponse({ description: 'Showing not found' })
  findByShowing(@Param('id', ParseUUIDPipe) id: string): Booking[] {
    return this.bookingsService.findByShowing(id);
  }
}
