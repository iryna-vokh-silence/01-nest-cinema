import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';
import {
  CALENDAR_DATE_REGEX,
  IsCalendarDate,
} from '../../common/validators/is-calendar-date.decorator';

export class FindShowingsQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    example: '3f2b8c1e-7a4d-4e9b-9c1a-2d5e6f7a8b9c',
    description: 'Filter by film',
  })
  @IsUUID()
  @IsOptional()
  filmId?: string;

  @ApiPropertyOptional({
    example: '2030-01-15',
    description:
      'Only showings starting on this day (YYYY-MM-DD, compared in UTC)',
  })
  @IsOptional()
  // Bottom-up: the format check runs first, then the real-date check.
  @IsCalendarDate()
  @Matches(CALENDAR_DATE_REGEX, { message: 'date must match YYYY-MM-DD' })
  date?: string;
}
