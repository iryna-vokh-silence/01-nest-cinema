import { forwardRef, Module } from '@nestjs/common';
import { FilmsModule } from '../films/films.module';
import { HallsModule } from '../halls/halls.module';
import { ShowingsController } from './showings.controller';
import { ShowingsService } from './showings.service';

@Module({
  imports: [forwardRef(() => FilmsModule), forwardRef(() => HallsModule)],
  controllers: [ShowingsController],
  providers: [ShowingsService],
  exports: [ShowingsService],
})
export class ShowingsModule {}
