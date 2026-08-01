# Realtime và hiệu suất server

Tài liệu này mô tả luồng realtime hiện tại, các giới hạn hiệu suất và đường nâng cấp khi số người chơi tăng. Mục tiêu là thao tác có phản hồi nhanh nhưng dữ liệu vẫn được lưu server và phục hồi đúng sau reload.

## Mục tiêu

| Chỉ số | Mục tiêu local | Mục tiêu production P95 |
|---|---:|---:|
| Mua hàng | dưới 100 ms | dưới 150 ms |
| Xuất quân | dưới 150 ms | dưới 200 ms |
| Bắt đầu xây thành | dưới 150 ms | dưới 200 ms |
| Socket delta | dưới 150 ms | dưới 250 ms |
| API thông thường | dưới 250 ms | dưới 400 ms |

Không có hệ thống mạng nào bảo đảm độ trễ bằng 0. Client phải phản hồi ngay bằng delta của command và dùng socket để xác nhận cho các tab/người chơi khác.

## Luồng command hiện tại

```text
Client gửi command + requestId
  -> server lấy khóa theo player
  -> kiểm tra quyền, tài nguyên và trạng thái nguồn/đích
  -> ghi dữ liệu bền vững vào MongoDB
  -> trả response delta cho client
  -> giải phóng khóa
  -> dựng nation/army state và phát socket ở nền
```

Client không gọi full sync sau khi mua hàng, tạo march hoặc bắt đầu clearing. Response đã chứa dữ liệu cần để render:

- Mua hàng: `resources`, `inventory`, `purchase`.
- Xuất quân: `march`, `town`, `newbieShieldUntil`.
- Xây thành: `clearing`.

Full snapshot `/api/player/sync` chỉ dùng khi đăng nhập, reload, reconnect hoặc phát hiện thiếu sequence socket.

## Những tối ưu đã triển khai

### Command và idempotency

- Mua skin và trang bị được thực hiện trong một request `/api/shop/purchase` với `equipTarget`.
- Purchase dùng `requestId` và unique index `(playerId, requestId)`.
- March hỗ trợ `requestId` và unique partial index `(ownerId, requestId)`.
- Clearing có unique index theo `territoryId`; gửi lại cùng mục tiêu trả clearing hiện có.
- Purchase, march và clearing dùng cùng khóa mutation theo player trong một process.

### Worker nền

- API đọc không chạy `processWorldTick()`.
- Worker chạy mỗi 500 ms và xử lý tối đa 100 march, battle hoặc clearing tới hạn mỗi lượt.
- Truy vấn worker dùng index thời gian và xử lý bản ghi cũ nhất trước.
- Economy settle chạy riêng mỗi 60 giây, chia tối đa 50 người chơi mỗi batch.
- Một request của người chơi không còn phải chờ tick của toàn thế giới.

### Cache, payload và HTTP

- Tạo march và bắt đầu clearing không làm tăng world cache version vì chưa đổi chủ lãnh thổ.
- Cache chỉ bị vô hiệu khi ownership hoặc metadata thế giới thật sự thay đổi.
- Danh sách 2.784 lãnh thổ tĩnh và bảng tra theo ID được tạo một lần trong mỗi process; command không tái sinh bản đồ khi kiểm tra đường đi.
- Response JSON trên 1 KB được nén bằng gzip/deflate tùy `Accept-Encoding`.
- Mỗi response có `Server-Timing: app;dur=...`.
- API từ 250 ms trở lên được log dạng `[slow-api] METHOD PATH STATUS DURATION`.

### Realtime và reload

- Command response cập nhật ngay tab thực hiện thao tác.
- Socket cập nhật tab khác và người chơi liên quan.
- Socket giữ sequence; khi phát hiện gap hoặc backlog, client gọi snapshot chuẩn.
- March, clearing, battle và inventory vẫn được đọc từ MongoDB sau reload.

## Luồng từng tính năng

### Mua và trang bị skin

```text
POST /api/shop/purchase
{ productId, requestId, equipTarget: "capital" }
```

Server kiểm tra giá từ catalog, số ngọc, quyền sở hữu, trừ ngọc, cấp skin và trang bị trong cùng command. Client không gọi tiếp `/api/shop/equip` sau khi mua.

### Xuất quân

```text
POST /api/game/marches
{ requestId, fromTerritoryId, toTerritoryId, infantry, cavalry, artillery, troops, kind }
```

Server khóa player, kiểm tra chuỗi lãnh thổ, quân nguồn, giới hạn march, ghi march và town mới rồi trả delta. Worker nền chịu trách nhiệm xử lý khi `arrivesAt` tới hạn.

### Xây thành

```text
POST /api/game/clearings
{ territoryId }
```

Server khóa player, dựa vào unique territory để chống hai người cùng chiếm, kiểm tra đường nối, tài nguyên và dân, sau đó ghi clearing. Worker nền hoàn tất khi `completesAt` tới hạn.

## Quan sát hiệu suất

Phép đo local ngày 31-07-2026 sau tối ưu, với MongoDB và API chạy trên cùng máy:

| Luồng | Trước | Sau |
|---|---:|---:|
| Mua và trang bị skin | khoảng 92 ms, 2 request | 19,2 ms, 1 request |
| Bắt đầu xây thành | 165,5 ms | 17,8 ms |
| Tạo march | 319,9 ms | 29,7 ms |
| March trùng `requestId` | chưa hỗ trợ | 5,4 ms, cùng march ID |
| Sync sau command | 276 ms | không còn gọi; phép đo kiểm chứng 73,6 ms |

Số đo local dùng để phát hiện regression, không thay thế load test production.

Trong DevTools, mở Network và xem header `Server-Timing`. Có thể kiểm tra nhanh:

```bash
curl -i -H "Authorization: Bearer $TOKEN" http://127.0.0.1:4000/api/player/sync
```

Các log `[slow-api]` cần được theo dõi theo route và percentile. Không tăng timeout để che request chậm; phải kiểm tra payload, số truy vấn, lock wait và cache miss.

## Khi chạy nhiều instance server

Khóa hiện tại là khóa trong memory và phù hợp cho một Node process. Trước khi chạy nhiều API instance cần hoàn thành các bước sau:

1. Chạy MongoDB replica set và dùng transaction cho purchase, march, clearing.
2. Thêm collection outbox; ghi state và event trong cùng transaction.
3. Worker claim outbox bằng lease, phát Redis Pub/Sub rồi đánh dấu `publishedAt`.
4. Thay khóa memory bằng distributed lock hoặc atomic conditional update có version.
5. Chia socket room theo `player:{id}` và `zone:{id}`; client chỉ subscribe zone trong viewport.
6. Tách world static khỏi world runtime; static dùng cache immutable, runtime dùng delta theo version.
7. Hỗ trợ `/api/player/sync?sinceVersion=N`; chỉ full snapshot khi version đã quá cũ.

Không được chạy nhiều Node instance trước khi có transaction/outbox hoặc atomic version check, vì hai instance có thể đồng thời trừ quân/tài nguyên của cùng người chơi.

## Kiểm thử bắt buộc

- Gửi hai purchase cùng `requestId`: chỉ trừ ngọc một lần.
- Gửi hai march cùng `requestId`: chỉ tạo một march.
- Hai người cùng xây một territory: chỉ một người thành công.
- Bấm xuất quân rồi reload ngay: march vẫn tồn tại.
- Bấm xây thành rồi reload: clearing và đội xây vẫn tồn tại.
- Restart server giữa hành quân: worker tiếp tục xử lý từ MongoDB.
- Socket reconnect: badge, inventory, march và clearing khớp snapshot.
- 50 request sync đồng thời không làm command purchase/march vượt ngưỡng P95.
