import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const MISSING_ID = '00000000-0000-4000-8000-000000000000';
const FUTURE = '2030-01-15T18:00:00.000Z';
const PAST = '2020-01-01T10:00:00.000Z';

interface IdBody {
  id: string;
}
interface ErrorBody {
  statusCode: number;
  message: string | string[];
}

/** Joins validation messages (array) or a single message into one string. */
function messageOf(body: unknown): string {
  const { message } = body as ErrorBody;
  return Array.isArray(message) ? message.join('; ') : message;
}

describe('Cinema API (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    http = app.getHttpServer();
  });

  afterEach(async () => {
    await app.close();
  });

  // ---------- helpers ----------

  async function createFilm(
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await request(http)
      .post('/films')
      .send({
        title: 'Interstellar',
        durationMinutes: 169,
        releaseYear: 2014,
        ...overrides,
      })
      .expect(201);
    return (res.body as IdBody).id;
  }

  async function createHall(
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await request(http)
      .post('/halls')
      .send({ name: 'Red Hall', rows: 3, seatsPerRow: 5, ...overrides })
      .expect(201);
    return (res.body as IdBody).id;
  }

  async function createShowing(
    filmId: string,
    hallId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const res = await request(http)
      .post('/showings')
      .send({ filmId, hallId, startsAt: FUTURE, price: 15000, ...overrides })
      .expect(201);
    return (res.body as IdBody).id;
  }

  async function setupShowing(): Promise<{
    filmId: string;
    hallId: string;
    showingId: string;
  }> {
    const filmId = await createFilm();
    const hallId = await createHall();
    const showingId = await createShowing(filmId, hallId);
    return { filmId, hallId, showingId };
  }

  // ---------- general ----------

  it('strips unknown properties (whitelist)', async () => {
    const res = await request(http)
      .post('/films')
      .send({
        title: 'Dune',
        durationMinutes: 155,
        releaseYear: 2021,
        isAdmin: true,
        id: 'hacked',
      })
      .expect(201);
    expect(res.body).not.toHaveProperty('isAdmin');
    expect((res.body as IdBody).id).not.toBe('hacked');
    expect(Object.keys(res.body as object).sort()).toEqual([
      'durationMinutes',
      'id',
      'releaseYear',
      'title',
    ]);
  });

  it('returns 400 for a non-UUID :id', async () => {
    await request(http).get('/films/not-a-uuid').expect(400);
    await request(http).get('/halls/123').expect(400);
    await request(http).get('/showings/abc').expect(400);
    await request(http).delete('/bookings/abc').expect(400);
  });

  // ---------- films ----------

  describe('films', () => {
    it('POST /films creates a film (201)', async () => {
      const res = await request(http)
        .post('/films')
        .send({
          title: 'Interstellar',
          durationMinutes: 169,
          releaseYear: 2014,
        })
        .expect(201);
      expect(res.body).toEqual({
        id: expect.any(String) as string,
        title: 'Interstellar',
        durationMinutes: 169,
        releaseYear: 2014,
      });
    });

    it('POST /films returns 400 for missing fields', async () => {
      const res = await request(http)
        .post('/films')
        .send({ title: 'Only title' })
        .expect(400);
      expect(messageOf(res.body)).toContain('durationMinutes');
      expect(messageOf(res.body)).toContain('releaseYear');
    });

    it('POST /films returns 400 for wrong types and ranges', async () => {
      await request(http)
        .post('/films')
        .send({ title: 42, durationMinutes: 100, releaseYear: 2000 })
        .expect(400);
      await request(http)
        .post('/films')
        .send({ title: 'A', durationMinutes: '100', releaseYear: 2000 })
        .expect(400);
      await request(http)
        .post('/films')
        .send({ title: 'A', durationMinutes: 0, releaseYear: 2000 })
        .expect(400);
      await request(http)
        .post('/films')
        .send({ title: 'A', durationMinutes: 90.5, releaseYear: 2000 })
        .expect(400);
      await request(http)
        .post('/films')
        .send({ title: 'A', durationMinutes: 90, releaseYear: 1999.5 })
        .expect(400);
    });

    it('GET /films returns an array', async () => {
      await request(http).get('/films').expect(200).expect([]);
      await createFilm();
      await createFilm({ title: 'Dune' });
      const res = await request(http).get('/films').expect(200);
      expect(res.body).toHaveLength(2);
    });

    it('GET /films/:id returns the film or 404', async () => {
      const id = await createFilm();
      const res = await request(http).get(`/films/${id}`).expect(200);
      expect(res.body).toMatchObject({ id, title: 'Interstellar' });
      await request(http).get(`/films/${MISSING_ID}`).expect(404);
    });

    it('PATCH /films/:id updates any subset', async () => {
      const id = await createFilm();
      const res = await request(http)
        .patch(`/films/${id}`)
        .send({ title: 'Interstellar (IMAX)' })
        .expect(200);
      expect(res.body).toEqual({
        id,
        title: 'Interstellar (IMAX)',
        durationMinutes: 169,
        releaseYear: 2014,
      });
      await request(http)
        .patch(`/films/${id}`)
        .send({ durationMinutes: 170, releaseYear: 2015 })
        .expect(200)
        .expect((r) =>
          expect(r.body).toMatchObject({
            durationMinutes: 170,
            releaseYear: 2015,
          }),
        );
    });

    it('PATCH /films/:id returns 400 for invalid values and 404 for missing', async () => {
      const id = await createFilm();
      await request(http)
        .patch(`/films/${id}`)
        .send({ durationMinutes: -5 })
        .expect(400);
      await request(http)
        .patch(`/films/${id}`)
        .send({ title: null })
        .expect(400);
      await request(http)
        .patch(`/films/${MISSING_ID}`)
        .send({ title: 'X' })
        .expect(404);
    });

    it('DELETE /films/:id returns 204, then 404', async () => {
      const id = await createFilm();
      const res = await request(http).delete(`/films/${id}`).expect(204);
      expect(res.text).toBe('');
      await request(http).get(`/films/${id}`).expect(404);
      await request(http).delete(`/films/${id}`).expect(404);
    });

    it('DELETE /films/:id returns 409 when a showing references the film', async () => {
      const { filmId } = await setupShowing();
      const res = await request(http).delete(`/films/${filmId}`).expect(409);
      expect(messageOf(res.body)).toContain('showings');
      await request(http).get(`/films/${filmId}`).expect(200);
    });
  });

  // ---------- halls ----------

  describe('halls', () => {
    it('POST /halls creates a hall (201)', async () => {
      const res = await request(http)
        .post('/halls')
        .send({ name: 'Red Hall', rows: 3, seatsPerRow: 5 })
        .expect(201);
      expect(res.body).toEqual({
        id: expect.any(String) as string,
        name: 'Red Hall',
        rows: 3,
        seatsPerRow: 5,
      });
    });

    it('POST /halls returns 400 for missing, wrong type, non-positive', async () => {
      await request(http).post('/halls').send({ name: 'A' }).expect(400);
      await request(http)
        .post('/halls')
        .send({ name: 'A', rows: '3', seatsPerRow: 5 })
        .expect(400);
      await request(http)
        .post('/halls')
        .send({ name: 'A', rows: 0, seatsPerRow: 5 })
        .expect(400);
      await request(http)
        .post('/halls')
        .send({ name: 'A', rows: 3, seatsPerRow: -1 })
        .expect(400);
      await request(http)
        .post('/halls')
        .send({ name: 'A', rows: 2.5, seatsPerRow: 5 })
        .expect(400);
    });

    it('POST /halls returns 409 for a duplicate name', async () => {
      await createHall({ name: 'Red Hall' });
      const res = await request(http)
        .post('/halls')
        .send({ name: 'Red Hall', rows: 1, seatsPerRow: 1 })
        .expect(409);
      expect(messageOf(res.body)).toContain('Red Hall');
      // case-insensitive, surrounding spaces ignored
      await request(http)
        .post('/halls')
        .send({ name: '  red hall ', rows: 1, seatsPerRow: 1 })
        .expect(409);
    });

    it('GET /halls returns an array', async () => {
      await createHall({ name: 'A' });
      await createHall({ name: 'B' });
      const res = await request(http).get('/halls').expect(200);
      expect(res.body).toHaveLength(2);
    });

    it('GET /halls/:id returns 15 seats for 3×5, or 404', async () => {
      const id = await createHall({ rows: 3, seatsPerRow: 5 });
      const res = await request(http).get(`/halls/${id}`).expect(200);
      const body = res.body as {
        seats: { row: number; seat: number }[];
      };
      expect(body).toMatchObject({ id, rows: 3, seatsPerRow: 5 });
      expect(body.seats).toHaveLength(15);
      expect(body.seats[0]).toEqual({ row: 1, seat: 1 });
      expect(body.seats[14]).toEqual({ row: 3, seat: 5 });
      await request(http).get(`/halls/${MISSING_ID}`).expect(404);
    });

    it('DELETE /halls/:id returns 204, then 404', async () => {
      const id = await createHall();
      await request(http).delete(`/halls/${id}`).expect(204);
      await request(http).get(`/halls/${id}`).expect(404);
      await request(http).delete(`/halls/${id}`).expect(404);
    });

    it('DELETE /halls/:id returns 409 when a showing references the hall', async () => {
      const { hallId } = await setupShowing();
      await request(http).delete(`/halls/${hallId}`).expect(409);
      await request(http).get(`/halls/${hallId}`).expect(200);
    });
  });

  // ---------- showings ----------

  describe('showings', () => {
    it('POST /showings creates a showing (201) with title and hall name', async () => {
      const filmId = await createFilm();
      const hallId = await createHall();
      const res = await request(http)
        .post('/showings')
        .send({ filmId, hallId, startsAt: FUTURE, price: 15000 })
        .expect(201);
      expect(res.body).toEqual({
        id: expect.any(String) as string,
        filmTitle: 'Interstellar',
        hallName: 'Red Hall',
        startsAt: FUTURE,
        price: 15000,
      });
    });

    it('POST /showings returns 400 (not 404) naming a missing film or hall', async () => {
      const filmId = await createFilm();
      const hallId = await createHall();
      const r1 = await request(http)
        .post('/showings')
        .send({ filmId: MISSING_ID, hallId, startsAt: FUTURE, price: 100 })
        .expect(400);
      expect(messageOf(r1.body)).toBe(`Film with id ${MISSING_ID} not found`);
      const r2 = await request(http)
        .post('/showings')
        .send({ filmId, hallId: MISSING_ID, startsAt: FUTURE, price: 100 })
        .expect(400);
      expect(messageOf(r2.body)).toBe(`Hall with id ${MISSING_ID} not found`);
    });

    it('POST /showings returns 400 for invalid or past startsAt', async () => {
      const filmId = await createFilm();
      const hallId = await createHall();
      for (const startsAt of [
        'not-a-date',
        '2030-13-01T10:00:00Z',
        '2030-02-30T10:00:00Z',
        '2030-01-15',
        '2030-01-15T18:00:00',
        12345,
      ]) {
        const res = await request(http)
          .post('/showings')
          .send({ filmId, hallId, startsAt, price: 100 })
          .expect(400);
        expect(messageOf(res.body)).toContain('startsAt');
      }
      const past = await request(http)
        .post('/showings')
        .send({ filmId, hallId, startsAt: PAST, price: 100 })
        .expect(400);
      expect(messageOf(past.body)).toBe('startsAt must be in the future');
    });

    it('POST /showings returns 400 for a non-positive or non-integer price', async () => {
      const filmId = await createFilm();
      const hallId = await createHall();
      for (const price of [0, -100, 99.5, '100']) {
        const res = await request(http)
          .post('/showings')
          .send({ filmId, hallId, startsAt: FUTURE, price })
          .expect(400);
        expect(messageOf(res.body)).toContain('price');
      }
    });

    it('POST /showings normalizes startsAt with offset to UTC', async () => {
      const filmId = await createFilm();
      const hallId = await createHall();
      const res = await request(http)
        .post('/showings')
        .send({
          filmId,
          hallId,
          startsAt: '2030-01-16T01:30:00+03:00',
          price: 100,
        })
        .expect(201);
      expect((res.body as { startsAt: string }).startsAt).toBe(
        '2030-01-15T22:30:00.000Z',
      );
    });

    it('GET /showings sorts by startsAt asc, ties by id', async () => {
      const filmId = await createFilm();
      const hallA = await createHall({ name: 'A' });
      const hallB = await createHall({ name: 'B' });
      const late = await createShowing(filmId, hallA, {
        startsAt: '2030-01-17T10:00:00.000Z',
      });
      const tie1 = await createShowing(filmId, hallA, {
        startsAt: '2030-01-15T10:00:00.000Z',
      });
      const tie2 = await createShowing(filmId, hallB, {
        startsAt: '2030-01-15T10:00:00.000Z',
      });
      const early = await createShowing(filmId, hallB, {
        startsAt: '2030-01-14T10:00:00.000Z',
      });

      const res = await request(http).get('/showings').expect(200);
      const ids = (res.body as IdBody[]).map((s) => s.id);
      const ties = [tie1, tie2].sort();
      expect(ids).toEqual([early, ...ties, late]);
      const first = (res.body as Record<string, unknown>[])[0];
      expect(first).toEqual({
        id: early,
        filmTitle: 'Interstellar',
        hallName: 'B',
        startsAt: '2030-01-14T10:00:00.000Z',
        price: 15000,
      });
      expect(first).not.toHaveProperty('filmId');
      expect(first).not.toHaveProperty('hallId');
    });

    it('GET /showings filters by filmId and date (AND, UTC date)', async () => {
      const film1 = await createFilm({ title: 'One' });
      const film2 = await createFilm({ title: 'Two' });
      const hallId = await createHall();
      const a = await createShowing(film1, hallId, {
        startsAt: '2030-01-15T10:00:00.000Z',
      });
      const b = await createShowing(film1, hallId, {
        startsAt: '2030-01-16T10:00:00.000Z',
      });
      const c = await createShowing(film2, hallId, {
        startsAt: '2030-01-15T12:00:00.000Z',
      });
      // 23:30 UTC on the 15th, although it is already the 16th in Kyiv
      const d = await createShowing(film2, hallId, {
        startsAt: '2030-01-16T01:30:00+02:00',
      });

      const ids = async (query: string): Promise<string[]> => {
        const res = await request(http).get(`/showings${query}`).expect(200);
        return (res.body as IdBody[]).map((s) => s.id);
      };

      expect(await ids(`?filmId=${film1}`)).toEqual([a, b]);
      expect(await ids('?date=2030-01-15')).toEqual([a, c, d]);
      expect(await ids(`?filmId=${film2}&date=2030-01-15`)).toEqual([c, d]);
      expect(await ids(`?filmId=${film1}&date=2030-01-16`)).toEqual([b]);
      expect(await ids('?date=2031-01-01')).toEqual([]);
      expect(await ids(`?filmId=${MISSING_ID}`)).toEqual([]);
    });

    it('GET /showings returns 400 for a bad date or filmId filter', async () => {
      for (const date of ['15-01-2030', '2030-1-5', '2030-02-30', 'today']) {
        const res = await request(http)
          .get(`/showings?date=${date}`)
          .expect(400);
        expect(messageOf(res.body)).toContain('date');
      }
      await request(http).get('/showings?filmId=abc').expect(400);
    });

    it('GET /showings/:id returns the view or 404', async () => {
      const { showingId } = await setupShowing();
      const res = await request(http).get(`/showings/${showingId}`).expect(200);
      expect(res.body).toEqual({
        id: showingId,
        filmTitle: 'Interstellar',
        hallName: 'Red Hall',
        startsAt: FUTURE,
        price: 15000,
      });
      await request(http).get(`/showings/${MISSING_ID}`).expect(404);
    });

    it('GET /showings/:id/seats returns all hall seats with status, or 404', async () => {
      const { showingId } = await setupShowing();
      await request(http)
        .post(`/showings/${showingId}/bookings`)
        .send({ seats: [{ row: 2, seat: 3 }] })
        .expect(201);
      const res = await request(http)
        .get(`/showings/${showingId}/seats`)
        .expect(200);
      const seats = res.body as {
        row: number;
        seat: number;
        isBooked: boolean;
      }[];
      expect(seats).toHaveLength(15);
      expect(seats.filter((s) => s.isBooked)).toEqual([
        { row: 2, seat: 3, isBooked: true },
      ]);
      expect(seats[0]).toEqual({ row: 1, seat: 1, isBooked: false });
      await request(http).get(`/showings/${MISSING_ID}/seats`).expect(404);
    });
  });

  // ---------- bookings ----------

  describe('bookings', () => {
    it('POST /showings/:id/bookings creates a booking with totalPrice', async () => {
      const { showingId } = await setupShowing();
      const res = await request(http)
        .post(`/showings/${showingId}/bookings`)
        .send({
          seats: [
            { row: 1, seat: 1, vip: true },
            { row: 1, seat: 2 },
          ],
        })
        .expect(201);
      expect(res.body).toEqual({
        id: expect.any(String) as string,
        showingId,
        seats: [
          { row: 1, seat: 1 },
          { row: 1, seat: 2 },
        ],
        totalPrice: 30000,
      });
    });

    it('POST /showings/:id/bookings returns 404 for a missing showing', async () => {
      await request(http)
        .post(`/showings/${MISSING_ID}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(404);
    });

    it('POST /showings/:id/bookings returns 400 for invalid bodies', async () => {
      const { showingId } = await setupShowing();
      const url = `/showings/${showingId}/bookings`;

      const empty = await request(http).post(url).send({ seats: [] });
      expect(empty.status).toBe(400);
      expect(messageOf(empty.body)).toContain('at least one seat');

      await request(http).post(url).send({}).expect(400);
      await request(http).post(url).send({ seats: 'A1' }).expect(400);
      await request(http)
        .post(url)
        .send({ seats: [{ row: 1 }] })
        .expect(400);
      await request(http)
        .post(url)
        .send({ seats: [{ row: '1', seat: 1 }] })
        .expect(400);
      await request(http)
        .post(url)
        .send({ seats: [{ row: 0, seat: 1 }] })
        .expect(400);
      await request(http)
        .post(url)
        .send({ seats: [{ row: 1, seat: -2 }] })
        .expect(400);
      await request(http)
        .post(url)
        .send({ seats: [{ row: 1, seat: 1.5 }] })
        .expect(400);
      await request(http)
        .post(url)
        .send({ seats: [null] })
        .expect(400);

      const dup = await request(http)
        .post(url)
        .send({
          seats: [
            { row: 1, seat: 1 },
            { row: 1, seat: 1 },
          ],
        })
        .expect(400);
      expect(messageOf(dup.body)).toContain('duplicate');

      const outRow = await request(http)
        .post(url)
        .send({ seats: [{ row: 4, seat: 1 }] })
        .expect(400);
      expect(messageOf(outRow.body)).toContain('outside hall');
      const outSeat = await request(http)
        .post(url)
        .send({ seats: [{ row: 1, seat: 6 }] })
        .expect(400);
      expect(messageOf(outSeat.body)).toContain('row 1 seat 6');

      // nothing was booked by any of the failing requests
      await request(http)
        .get(`/showings/${showingId}/bookings`)
        .expect(200, []);
    });

    it('is all-or-nothing: 409 if any seat is taken, nothing is booked', async () => {
      const { showingId } = await setupShowing();
      const url = `/showings/${showingId}/bookings`;
      await request(http)
        .post(url)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(201);

      const res = await request(http)
        .post(url)
        .send({
          seats: [
            { row: 1, seat: 2 },
            { row: 1, seat: 1 },
          ],
        })
        .expect(409);
      expect(messageOf(res.body)).toContain('row 1 seat 1');

      const seats = await request(http)
        .get(`/showings/${showingId}/seats`)
        .expect(200);
      const booked = (seats.body as { isBooked: boolean }[]).filter(
        (s) => s.isBooked,
      );
      expect(booked).toHaveLength(1); // row 1 seat 2 stayed free
      const list = await request(http).get(url).expect(200);
      expect(list.body).toHaveLength(1);

      // a seat outside the hall in the same request also books nothing
      await request(http)
        .post(url)
        .send({
          seats: [
            { row: 1, seat: 2 },
            { row: 9, seat: 9 },
          ],
        })
        .expect(400);
      await request(http)
        .get(url)
        .expect(200)
        .expect((r) => expect(r.body).toHaveLength(1));
    });

    it('same seat can be booked for different showings', async () => {
      const { filmId, hallId, showingId } = await setupShowing();
      const other = await createShowing(filmId, hallId, {
        startsAt: '2030-01-16T18:00:00.000Z',
      });
      const body = { seats: [{ row: 1, seat: 1 }] };
      await request(http)
        .post(`/showings/${showingId}/bookings`)
        .send(body)
        .expect(201);
      await request(http)
        .post(`/showings/${other}/bookings`)
        .send(body)
        .expect(201);
    });

    it('GET /showings/:id/bookings lists bookings of a showing, or 404', async () => {
      const { filmId, hallId, showingId } = await setupShowing();
      const other = await createShowing(filmId, hallId, {
        startsAt: '2030-01-16T18:00:00.000Z',
      });
      await request(http)
        .post(`/showings/${showingId}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(201);
      await request(http)
        .post(`/showings/${other}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(201);
      const res = await request(http)
        .get(`/showings/${showingId}/bookings`)
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect((res.body as Record<string, unknown>[])[0]).toMatchObject({
        showingId,
      });
      await request(http).get(`/showings/${MISSING_ID}/bookings`).expect(404);
    });

    it('GET /bookings lists all bookings', async () => {
      await request(http).get('/bookings').expect(200, []);
      const { showingId } = await setupShowing();
      await request(http)
        .post(`/showings/${showingId}/bookings`)
        .send({ seats: [{ row: 1, seat: 1 }] })
        .expect(201);
      const res = await request(http).get('/bookings').expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('DELETE /bookings/:id frees seats (204), then 404', async () => {
      const { showingId } = await setupShowing();
      const url = `/showings/${showingId}/bookings`;
      const created = await request(http)
        .post(url)
        .send({
          seats: [
            { row: 3, seat: 4 },
            { row: 3, seat: 5 },
          ],
        })
        .expect(201);
      const bookingId = (created.body as IdBody).id;

      await request(http)
        .post(url)
        .send({ seats: [{ row: 3, seat: 5 }] })
        .expect(409);

      const del = await request(http)
        .delete(`/bookings/${bookingId}`)
        .expect(204);
      expect(del.text).toBe('');

      const seats = await request(http)
        .get(`/showings/${showingId}/seats`)
        .expect(200);
      expect(
        (seats.body as { isBooked: boolean }[]).every((s) => !s.isBooked),
      ).toBe(true);
      await request(http)
        .post(url)
        .send({ seats: [{ row: 3, seat: 5 }] })
        .expect(201);

      await request(http).delete(`/bookings/${bookingId}`).expect(404);
      await request(http).delete(`/bookings/${MISSING_ID}`).expect(404);
    });
  });
});
