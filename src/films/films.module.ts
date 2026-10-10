import { forwardRef, Module } from '@nestjs/common';
import { ShowingsModule } from '../showings/showings.module';
import { FilmsController } from './films.controller';
import { FilmsService } from './films.service';

@Module({
  // forwardRef: showings need films (existence, titles) and films need
  // showings (409 on delete when a showing references the film).
  imports: [forwardRef(() => ShowingsModule)],
  controllers: [FilmsController],
  providers: [FilmsService],
  exports: [FilmsService],
})
export class FilmsModule {}
