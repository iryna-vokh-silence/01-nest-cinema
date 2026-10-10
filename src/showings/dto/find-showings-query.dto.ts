import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';
import {
  CALENDAR_DATE_REGEX,
  IsCalendarDate,
} from '../../common/validators/is-calendar-date.decorator';

export class FindShowingsQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Filter by film' })
  @IsOptional()
  @IsUUID()
  filmId?: string;

  @ApiPropertyOptional({
    example: '2030-01-15',
    description:
      'Only showings starting on this day (YYYY-MM-DD, compared in UTC)',
  })
  @IsOptional()
  @Matches(CALENDAR_DATE_REGEX, { message: 'date must match YYYY-MM-DD' })
  @IsCalendarDate()
  date?: string;
}
