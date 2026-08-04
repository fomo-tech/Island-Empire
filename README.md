# Island Empire Pixel

TypeScript monorepo cho game pixel chiến thuật đảo:

- `apps/game`: React + Vite client, canvas game engine.
- `apps/admin`: React + Vite admin dashboard.
- `apps/server`: Node.js + Express + MongoDB API.
- `packages/shared`: TypeScript types dùng chung.

## Chạy local

```bash
npm run install:all
cp .env.example .env
npm run dev:server
npm run dev:game
npm run dev:admin
```

Mặc định:

- Game: `http://127.0.0.1:5173`
- Admin: `http://127.0.0.1:5174`
- API: `http://127.0.0.1:4000/api/health`

## Bảo mật

- API tắt `x-powered-by`, dùng `helmet`, CORS allowlist, JSON size limit và rate limit.
- Admin login dùng env `ADMIN_USER`, `ADMIN_PASSWORD`, JWT secret từ `JWT_SECRET`.
- MongoDB URI lấy từ `MONGO_URI`, không hard-code secret.
- Production phải đặt Nginx/WAF trước Node theo [`deploy/nginx/island-empire.conf`](deploy/nginx/island-empire.conf). Chỉ mở cổng `80/443`; cổng Node `4000` và MongoDB không được public. Khi Nginx là đường vào duy nhất, đặt `TRUST_PROXY=true`.

## Kiểm tra

```bash
npm run typecheck
npm run build
```

## Realtime và hiệu suất

Kiến trúc command, worker nền, socket, chỉ tiêu độ trễ và kế hoạch mở rộng nhiều server được ghi tại [`docs/REALTIME_PERFORMANCE.md`](docs/REALTIME_PERFORMANCE.md).
