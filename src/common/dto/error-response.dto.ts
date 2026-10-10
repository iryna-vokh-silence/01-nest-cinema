import { ApiProperty } from '@nestjs/swagger';

/** Shape of every error response produced by Nest's exception filter. */
export class ErrorResponseDto {
  @ApiProperty({ type: 'integer', example: 400 })
  statusCode: number;

  @ApiProperty({
    oneOf: [
      { type: 'string', example: 'Film with id ... not found' },
      { type: 'array', items: { type: 'string' } },
    ],
    description:
      'A single message, or a list of validation messages for 400 errors',
  })
  message: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}
