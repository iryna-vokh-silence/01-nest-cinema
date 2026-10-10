import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Seat } from '../common/seat';
import { ShowingsService } from '../showings/showings.service';
import { CreateHallDto } from './dto/create-hall.dto';
import { Hall, HallWithSeats } from './entities/hall.entity';

@Injectable()
export class HallsService {
  private readonly halls: Hall[] = [];

  constructor(
    @Inject(forwardRef(() => ShowingsService))
    private readonly showingsService: ShowingsService,
  ) {}

  create(dto: CreateHallDto): Hall {
    const name = dto.name.trim();
    const normalized = name.toLowerCase();
    if (this.halls.some((h) => h.name.toLowerCase() === normalized)) {
      throw new ConflictException(`Hall with name "${name}" already exists`);
    }
    const hall: Hall = {
      id: randomUUID(),
      name,
      rows: dto.rows,
      seatsPerRow: dto.seatsPerRow,
    };
    this.halls.push(hall);
    return { ...hall };
  }

  findAll(): Hall[] {
    return this.halls.map((hall) => ({ ...hall }));
  }

  /** Returns the hall with its computed seat list, or throws 404. */
  findOneWithSeats(id: string): HallWithSeats {
    const hall = this.getOrThrow(id);
    return { ...hall, seats: this.computeSeats(hall) };
  }

  /** Non-throwing lookup for other modules. */
  findById(id: string): Hall | undefined {
    const hall = this.halls.find((h) => h.id === id);
    return hall ? { ...hall } : undefined;
  }

  /** All seats of a hall in row-major order, 1-based. */
  computeSeats(hall: Pick<Hall, 'rows' | 'seatsPerRow'>): Seat[] {
    const seats: Seat[] = [];
    for (let row = 1; row <= hall.rows; row++) {
      for (let seat = 1; seat <= hall.seatsPerRow; seat++) {
        seats.push({ row, seat });
      }
    }
    return seats;
  }

  isSeatInHall(hall: Pick<Hall, 'rows' | 'seatsPerRow'>, seat: Seat): boolean {
    return (
      seat.row >= 1 &&
      seat.row <= hall.rows &&
      seat.seat >= 1 &&
      seat.seat <= hall.seatsPerRow
    );
  }

  remove(id: string): void {
    const hall = this.getOrThrow(id);
    if (this.showingsService.hasShowingsForHall(id)) {
      throw new ConflictException(
        `Hall with id ${id} cannot be deleted because it has showings`,
      );
    }
    this.halls.splice(this.halls.indexOf(hall), 1);
  }

  private getOrThrow(id: string): Hall {
    const hall = this.halls.find((h) => h.id === id);
    if (!hall) {
      throw new NotFoundException(`Hall with id ${id} not found`);
    }
    return hall;
  }
}
