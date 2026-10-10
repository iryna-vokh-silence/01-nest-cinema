import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { CreateShowingDto } from './dto/create-showing.dto';
import { FindShowingsQueryDto } from './dto/find-showings-query.dto';
import { ShowingView } from './entities/showing.entity';
import { ShowingsService } from './showings.service';

@ApiTags('showings')
@Controller('showings')
export class ShowingsController {
  constructor(private readonly showingsService: ShowingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a showing' })
  @ApiCreatedResponse({ type: ShowingView, description: 'Showing created' })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      'Film or hall not found, startsAt invalid or in the past, price not a positive integer',
  })
  create(@Body() dto: CreateShowingDto): ShowingView {
    return this.showingsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List showings',
    description:
      'Optional filters combine with AND. `date` matches the UTC date part of startsAt. Sorted by startsAt ascending, ties by id.',
  })
  @ApiOkResponse({ type: ShowingView, isArray: true })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'Invalid filmId or date format',
  })
  findAll(@Query() query: FindShowingsQueryDto): ShowingView[] {
    return this.showingsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a showing by id' })
  @ApiOkResponse({ type: ShowingView })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description: 'id is not a UUID',
  })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Showing not found',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string): ShowingView {
    return this.showingsService.findOne(id);
  }
}
