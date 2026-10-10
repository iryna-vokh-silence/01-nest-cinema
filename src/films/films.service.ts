import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ShowingsService } from '../showings/showings.service';
import { CreateFilmDto } from './dto/create-film.dto';
import { UpdateFilmDto } from './dto/update-film.dto';
import { Film } from './entities/film.entity';

@Injectable()
export class FilmsService {
  private readonly films: Film[] = [];

  constructor(
    @Inject(forwardRef(() => ShowingsService))
    private readonly showingsService: ShowingsService,
  ) {}

  create(dto: CreateFilmDto): Film {
    const film: Film = {
      id: randomUUID(),
      title: dto.title,
      durationMinutes: dto.durationMinutes,
      releaseYear: dto.releaseYear,
    };
    this.films.push(film);
    return { ...film };
  }

  findAll(): Film[] {
    return this.films.map((film) => ({ ...film }));
  }

  /** Returns the film or throws 404. */
  findOne(id: string): Film {
    return { ...this.getOrThrow(id) };
  }

  /** Non-throwing lookup for other modules (e.g. showings need a 400). */
  findById(id: string): Film | undefined {
    const film = this.films.find((f) => f.id === id);
    return film ? { ...film } : undefined;
  }

  update(id: string, dto: UpdateFilmDto): Film {
    const film = this.getOrThrow(id);
    if (dto.title !== undefined) film.title = dto.title;
    if (dto.durationMinutes !== undefined) {
      film.durationMinutes = dto.durationMinutes;
    }
    if (dto.releaseYear !== undefined) film.releaseYear = dto.releaseYear;
    return { ...film };
  }

  remove(id: string): void {
    const film = this.getOrThrow(id);
    if (this.showingsService.hasShowingsForFilm(id)) {
      throw new ConflictException(
        `Film with id ${id} cannot be deleted because it has showings`,
      );
    }
    this.films.splice(this.films.indexOf(film), 1);
  }

  private getOrThrow(id: string): Film {
    const film = this.films.find((f) => f.id === id);
    if (!film) {
      throw new NotFoundException(`Film with id ${id} not found`);
    }
    return film;
  }
}
