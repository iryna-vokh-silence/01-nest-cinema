# 01-nest-cinema — REST API кінотеатру на NestJS

**Студентка:** Вох Ірина (Iryna Vokh)

REST API для кінотеатру: фільми, зали, сеанси та бронювання місць.
Застосунок розбитий на доменні модулі (`films`, `halls`, `showings`, `bookings`);
кожен модуль має «тонкий» контролер і сервіс з бізнес-логікою.
Модулі взаємодіють лише через експортовані сервіси й не мають доступу до чужих даних.

> **Дані зберігаються в пам'яті** (приватні масиви всередині сервісів).
> Бази даних немає, тож після перезапуску сервера всі дані зникають.

## Стек

- Node.js 20+ (перевірено на Node 22), TypeScript
- NestJS 11 (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`)
- `class-validator` + `class-transformer` — валідація DTO
- `@nestjs/swagger` — документація API (Swagger UI)
- `@nestjs/config` — читання `.env` (`PORT` береться через `ConfigService`)
- Jest + Supertest — e2e-тести; ESLint + Prettier — стиль коду

## Запуск

```bash
npm install
cp .env.example .env   # необов'язково: за замовчуванням порт 3000
npm run start:dev
```

Файл `.env` (приклад у `.env.example`):

```env
PORT=3000
```

Swagger UI: <http://localhost:3000/docs>

### Інші команди

```bash
npm run build      # збірка в dist/
npm run start:prod # запуск зібраної версії
npm run test:e2e   # e2e-тести (Jest + Supertest)
npm test           # unit-тести
npm run lint       # ESLint
npx prettier --check src test
```

## Модель даних

| Сутність | Поля |
|---|---|
| Film | `id`, `title` (непорожній рядок, до 200 символів), `durationMinutes` (ціле, 1–1000), `releaseYear` (ціле, 1888–2100) |
| Hall | `id`, `name` (унікальна, непорожня, до 100 символів), `rows` (ціле, 1–50), `seatsPerRow` (ціле, 1–50) |
| Showing | `id`, `filmId`, `hallId`, `startsAt` (ISO 8601), `price` (ціле, 1–10 000 000, у **копійках**) |
| Booking | `id`, `showingId`, `seats: [{ row, seat }]`, `totalPrice = price × кількість місць` |

- Окремої сутності «місце» немає: місця зали обчислюються як `rows × seatsPerRow`,
  нумерація рядів і місць починається з 1.
- Ідентифікатори — UUID (`randomUUID()` з `node:crypto`).

## Маршрути

### Фільми
| Метод | Шлях | Відповіді |
|---|---|---|
| POST | `/films` | 201 фільм · 400 відсутнє/порожнє поле, неправильний тип, вихід за межі |
| GET | `/films` | 200 масив |
| GET | `/films/:id` | 200 · 404 |
| PATCH | `/films/:id` | 200 оновлений фільм (будь-яка підмножина полів) · 400 · 404 |
| DELETE | `/films/:id` | 204 · 404 · 409 якщо є сеанси з цим фільмом |

### Зали
| Метод | Шлях | Відповіді |
|---|---|---|
| POST | `/halls` | 201 · 400 (відсутнє/порожнє поле, тип, не в межах 1–50) · 409 зала з такою назвою вже існує |
| GET | `/halls` | 200 масив |
| GET | `/halls/:id` | 200 зала + `seats: [{ row, seat }]` (3×5 → 15 місць) · 404 |
| DELETE | `/halls/:id` | 204 · 404 · 409 якщо є сеанси в цій залі |

### Сеанси
| Метод | Шлях | Відповіді |
|---|---|---|
| POST | `/showings` | 201 · 400 фільм/зала не знайдені, некоректна або минула дата, ціна не ціле в межах 1–10 000 000 |
| GET | `/showings?filmId=&date=` | 200 масив · 400 неправильний формат дати |
| GET | `/showings/:id` | 200 · 404 |
| GET | `/showings/:id/seats` | 200 `[{ row, seat, isBooked }]` · 404 |

Відповідь для сеансу: `{ id, filmTitle, hallName, startsAt, price }` —
назва фільму та зали замість `filmId`/`hallId`.

### Бронювання
| Метод | Шлях | Відповіді |
|---|---|---|
| GET | `/bookings` | 200 масив |
| POST | `/showings/:id/bookings` | 201 бронювання з `totalPrice` · 404 сеанс не знайдено · 400 · 409 місце вже зайняте |
| GET | `/showings/:id/bookings` | 200 · 404 |
| DELETE | `/bookings/:id` | 204 (місця звільняються) · 404 |

Невалідний UUID у параметрі `:id` → 400 (`ParseUUIDPipe`).

## Правила та рішення

- **Розподіл валідації.** DTO (`class-validator`) перевіряють наявність полів, типи,
  діапазони, формати, вкладені об'єкти та дублікати місць у масиві.
  Сервіси перевіряють те, що залежить від стану: існування сутностей, межі зали,
  зайнятість місць, залежні сеанси, унікальність назви зали, дату в майбутньому.
- **Обрізання пробілів.** `title` фільму та `name` зали обрізаються (`@Transform` + `trim()`)
  ще до валідації, тож рядок із самих пробілів (`"   "`) дає 400 `should not be empty`
  (і при створенні, і при `PATCH`).
- **Верхні межі** (захист від надто великих запитів; напр. зала 100000×100000
  «повісила» б сервер на `GET /halls/:id`): `rows` ≤ 50, `seatsPerRow` ≤ 50,
  `durationMinutes` ≤ 1000, `price` ≤ 10 000 000 копійок (100 000 грн). Межі вказані й у Swagger.
- **Повідомлення валідації.** `ValidationPipe` працює зі `stopAtFirstError: true`:
  на кожне поле — одне повідомлення (спершу «відсутнє», потім тип, потім діапазон),
  напр. `title should not be null or undefined`. Для місць у бронюванні:
  `each seat must be an object {row, seat}`, `seats must not contain duplicate seats`.
- **Формат помилок** (описаний у Swagger як `ErrorResponseDto`):
  `{ "statusCode": 400, "message": "..." | ["..."], "error": "Bad Request" }`.
- **Whitelist.** Глобальний `ValidationPipe({ whitelist: true, transform: true })`
  відкидає зайві поля з тіла запиту (без помилки).
- **Неіснуючий фільм/зала при створенні сеансу → 400**, а не 404: це помилка в тілі
  запиту. Повідомлення вказує, що саме не знайдено, напр. `Film with id ... not found`.
- **`startsAt`** — повна дата-час ISO 8601 з часовою зоною (`Z` або `±HH:MM`),
  наприклад `2030-01-15T18:00:00.000Z`; має бути в майбутньому.
  Значення зберігається нормалізованим до UTC (`toISOString()`).
- **Фільтр `date`** (`YYYY-MM-DD`, має бути реальною датою) порівнюється з
  **датою `startsAt` в UTC**. Наприклад, сеанс `2030-01-16T01:30:00+02:00`
  (= `2030-01-15T23:30:00.000Z`) потрапляє у фільтр `date=2030-01-15`.
  Фільтри `filmId` і `date` поєднуються через «І».
- **Сортування сеансів:** за `startsAt` за зростанням, при однаковому часі — за `id`.
- **Бронювання «все або нічого»:** якщо хоча б одне місце поза залою (400) або
  вже зайняте (409), не бронюється жодне місце із запиту.
- **Назва зали унікальна** без урахування регістру та пробілів на краях.
- Видалити фільм або залу, на які посилається сеанс, не можна (409),
  тому в сеансів завжди є фільм і зала.

## requests.http

У корені є файл `requests.http` — колекція запитів, яку можна виконувати
**згори донизу** (розширення VS Code **REST Client**). Запити іменовані
(`# @name createFilm`), а id беруться з попередніх відповідей
(`@filmId = {{createFilm.response.body.id}}`) — жодних захардкоджених id.
Порядок: фільм → зала → сеанс → бронювання → решта маршрутів → усі помилкові
сценарії (400/404/409) → скасування бронювання й перевірка, що місця звільнилися.
Біля кожного запиту є коментар `# Expected: <код>` з очікуваним статусом.

Файл написаний у синтаксисі REST Client. HTTP-клієнт JetBrains
(WebStorm/IntelliJ) теж відкриває `.http`-файли, але посилання на відповіді
(`{{createFilm.response.body.id}}`) там можуть не підтримуватися — у JetBrains
для цього зазвичай використовують response-handler (`client.global.set(...)`).
Для проходу згори донизу рекомендовано VS Code REST Client.

## Структура

```
src/
  main.ts, app.module.ts, app.setup.ts   # bootstrap, ValidationPipe, Swagger
  common/                                # Seat, ErrorResponseDto, межі (limits.ts),
                                         # Trim, кастомні валідатори
  films/      # FilmsController, FilmsService, DTO
  halls/      # HallsController, HallsService (обчислення місць)
  showings/   # ShowingsController, ShowingsService (фільтри, сортування)
  bookings/   # BookingsController (/bookings), ShowingBookingsController
              # (/showings/:id/bookings), ShowingSeatsController
              # (/showings/:id/seats, у Swagger під тегом showings), BookingsService
test/app.e2e-spec.ts                     # e2e-тести всіх маршрутів і помилок
requests.http                            # колекція запитів
```

Циклічні залежності `films ↔ showings` і `halls ↔ showings` (перевірка 409 при
видаленні) розв'язані через `forwardRef`. Маршрути `/showings/:id/seats` і
`/showings/:id/bookings` належать модулю `bookings`, бо залежать від зайнятості
місць — так модуль `showings` не залежить від `bookings`.
