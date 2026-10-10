import { Module } from '@nestjs/common';
import { HallsModule } from '../halls/halls.module';
import { ShowingsModule } from '../showings/showings.module';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { ShowingBookingsController } from './showing-bookings.controller';

@Module({
  imports: [ShowingsModule, HallsModule],
  controllers: [BookingsController, ShowingBookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
