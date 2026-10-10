import { ApiProperty } from '@nestjs/swagger';

export class Film {
  @ApiProperty({
    format: 'uuid',
    example: '3f2b8c1e-7a4d-4e9b-9c1a-2d5e6f7a8b9c',
  })
  id: string;

  @ApiProperty({ example: 'Interstellar' })
  title: string;

  @ApiProperty({ type: 'integer', example: 169, minimum: 1 })
  durationMinutes: number;

  @ApiProperty({ type: 'integer', example: 2014 })
  releaseYear: number;
}
