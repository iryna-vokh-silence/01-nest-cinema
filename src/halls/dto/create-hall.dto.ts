import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateHallDto {
  @ApiProperty({
    example: 'Red Hall',
    maxLength: 100,
    description: 'Unique (case-insensitive, surrounding spaces ignored)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 3, minimum: 1, description: 'Positive integer' })
  @IsInt()
  @Min(1)
  rows: number;

  @ApiProperty({ example: 5, minimum: 1, description: 'Positive integer' })
  @IsInt()
  @Min(1)
  seatsPerRow: number;
}
