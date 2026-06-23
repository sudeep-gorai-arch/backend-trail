# VividWalls Backend API

Express + TypeScript + Prisma + PostgreSQL backend for the VividWalls /
WallpaperX mobile app.

## Setup

```bash
npm install
cp .env.example .env          # then edit DATABASE_URL + JWT_SECRET
npx prisma migrate dev --name init
npm run db:seed
npm run dev                   # http://localhost:5000
```

## Architecture

Request flow: **route → middleware → controller → service → Prisma**.

```
src/
├── config/        env validation + Prisma client (DB connection)
├── controllers/   thin HTTP layer (parse req, call service, send res)
├── services/      business logic + all Prisma queries
├── routes/        endpoint definitions + zod validation
├── middlewares/   auth guard, validation, central error handler, 404
├── utils/         ApiError, asyncHandler, jwt, password, response, dto
├── types/         Express Request augmentation (req.user)
├── app.ts         express app assembly
└── server.ts      bootstrap + graceful shutdown
```

## Auth

JWT bearer tokens. `register`/`login` return `{ user, token }`; send the token
as `Authorization: Bearer <token>` on protected routes.

Demo user (after seeding): `demo@vividwalls.app` / `Password123`.

## Endpoints

All responses use `{ success, data, message?, pagination? }`.

### Auth
| Method | Path                | Body                          |
|--------|---------------------|-------------------------------|
| POST   | /api/auth/register  | email, username, password     |
| POST   | /api/auth/login     | email, password               |

### Home / Wallpapers
| Method | Path                        | Notes                                   |
|--------|-----------------------------|-----------------------------------------|
| GET    | /api/wallpapers             | ?limit&offset&search&category           |
| GET    | /api/wallpapers/featured    | ?limit — Home hero                      |
| GET    | /api/wallpapers/trending    | ?limit — Home trending rail             |
| GET    | /api/wallpapers/:id         | single wallpaper                        |

### Categories
| Method | Path                              | Notes                       |
|--------|-----------------------------------|-----------------------------|
| GET    | /api/categories                   | with wallpaper counts       |
| GET    | /api/categories/:slug/wallpapers  | ?limit&offset               |

### Profile (protected)
| Method | Path                          | Body          |
|--------|-------------------------------|---------------|
| GET    | /api/users/me                 | —             |
| GET    | /api/favorites                | ?limit&offset |
| POST   | /api/favorites                | wallpaperId   |
| DELETE | /api/favorites/:wallpaperId   | —             |
| GET    | /api/downloads                | ?limit&offset |
| POST   | /api/downloads                | wallpaperId   |

### Health
`GET /api/health`
