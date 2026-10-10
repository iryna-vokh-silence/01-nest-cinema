import { forwardRef, Module } from '@nestjs/common';
import { ShowingsModule } from '../showings/showings.module';
import { HallsController } from './halls.controller';
import { HallsService } from './halls.service';

@Module({
  // forwardRef: showings need halls and halls need showings (409 on delete).
  imports: [forwardRef(() => ShowingsModule)],
  controllers: [HallsController],
  providers: [HallsService],
  exports: [HallsService],
})
export class HallsModule {}
