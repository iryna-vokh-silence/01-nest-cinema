import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FilmsService } from '../films/films.service';
import { HallsService } from '../halls/halls.service';
import { CreateShowingDto } from './dto/create-showing.dto';
import { FindShowingsQueryDto } from './dto/find-showings-query.dto';
import { Showing, ShowingView } from './entities/showing.entity';

@Injectable()
export class ShowingsService {
  private readonly showings: Showing[] = [];

  constructor(
    @Inject(forwardRef(() => FilmsService))
    private readonly filmsService: FilmsService,
    @Inject(forwardRef(() => HallsService))
    private readonly hallsService: HallsService,
  ) {}

  create(dto: CreateShowingDto): ShowingView {
    // Referenced entities live in the request body, so a missing one is a
    // bad request (400), not a missing resource (404).
    if (!this.filmsService.findById(dto.filmId)) {
      throw new BadRequestException(`Film with id ${dto.filmId} not found`);
    }
    if (!this.hallsService.findById(dto.hallId)) {
      throw new BadRequestException(`Hall with id ${dto.hallId} not found`);
    }
    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException(
        'startsAt must be a valid ISO 8601 date-time',
      );
    }
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('startsAt must be in the future');
    }

    const showing: Showing = {
      id: randomUUID(),
      filmId: dto.filmId,
      hallId: dto.hallId,
      startsAt: startsAt.toISOString(),
      price: dto.price,
    };
    this.showings.push(showing);
    return this.toView(showing);
  }

  /** Filters combine with AND; sorted by startsAt asc, then by id. */
  findAll(query: FindShowingsQueryDto): ShowingView[] {
    return this.showings
      .filter((s) => !query.filmId || s.filmId === query.filmId)
      .filter((s) => !query.date || s.startsAt.slice(0, 10) === query.date)
      .sort(
        (a, b) =>
          Date.parse(a.startsAt) - Date.parse(b.startsAt) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )
      .map((s) => this.toView(s));
  }

  findOne(id: string): ShowingView {
    return this.toView(this.getEntity(id));
  }

  /** Raw showing (with filmId/hallId) for other modules; throws 404. */
  getEntity(id: string): Showing {
    const showing = this.showings.find((s) => s.id === id);
    if (!showing) {
      throw new NotFoundException(`Showing with id ${id} not found`);
    }
    return { ...showing };
  }

  hasShowingsForFilm(filmId: string): boolean {
    return this.showings.some((s) => s.filmId === filmId);
  }

  hasShowingsForHall(hallId: string): boolean {
    return this.showings.some((s) => s.hallId === hallId);
  }

  private toView(showing: Showing): ShowingView {
    // Films/halls with showings cannot be deleted, so both must exist.
    const film = this.filmsService.findById(showing.filmId);
    const hall = this.hallsService.findById(showing.hallId);
    if (!film || !hall) {
      throw new InternalServerErrorException(
        `Showing ${showing.id} references a missing ${film ? 'hall' : 'film'}`,
      );
    }
    return {
      id: showing.id,
      filmTitle: film.title,
      hallName: hall.name,
      startsAt: showing.startsAt,
      price: showing.price,
    };
  }
}
