# Hệ thống tài nguyên

## Bộ tài nguyên đang hoạt động

- `food`: lương thực cho bộ binh, kị binh và xây dựng.
- `wood`: vật liệu cho bộ binh, kị binh và xây dựng.
- `stone`: công trình phòng thủ và pháo binh.
- `gold`: quân phí, xây dựng và giao dịch.
- `gems`: tiền tệ đặc biệt cho cửa hàng; hiện chưa có nạp tiền.

Lương thực, gỗ, đá và vàng có giới hạn kho. Mỗi lãnh thổ sở hữu tăng giới hạn từng loại và có kho riêng. Khi lãnh thổ bị chiếm, phần tài nguyên nằm trong kho đó được chuyển cho bên thắng trong giới hạn kho của họ. Ngọc thuộc tài khoản, không nằm trong kho lãnh thổ và không bị cướp.

## Sản lượng lãnh thổ

Mọi lãnh thổ sinh bốn tài nguyên thường. Hệ sinh thái, diện tích và hệ số chất lượng cố định theo seed làm sản lượng mỗi vùng khác nhau. Chất lượng nằm trong khoảng 80-120% và không đổi sau reload.

`Mỏ Ngọc` xuất hiện cố định với tỷ lệ 0,7%. Chỉ các lãnh thổ này sinh ngọc. Đảo không còn tự động được cộng ngọc.

## Chuyên môn quân sự

- Có `Bãi ngựa`: chỉ bổ sung kị binh.
- Có `Xưởng rèn`: chỉ bổ sung pháo binh.
- Các lãnh thổ còn lại: chỉ bổ sung bộ binh.

Bãi ngựa và Xưởng rèn loại trừ nhau. Việc kiểm tra chuyên môn, trừ tài nguyên, hồi quân và lưu trạng thái đều do server xử lý trước khi phát realtime.

## Chuyển dữ liệu cũ

Khi người chơi đồng bộ lần đầu với phiên bản tài nguyên 2, server chuyển một lần:

- Toàn bộ sắt, than và lưu huỳnh cũ thành đá.
- Cộng thêm vàng bằng 20% số sắt cũ.
- Ghi `resourceMigrationVersion: 2` vào player và save để không chuyển lặp.

Client không tự chuyển hoặc tự cộng tài nguyên.

## Assets và tooltip

Metadata đặc điểm chiến lược nằm tại `SpecialResourceDisplay.tsx`. Tooltip và các màn hình sau này phải dùng metadata này thay vì tự khai báo tên hoặc đường dẫn ảnh.

- Assets bản đồ: `apps/game/public/assets/special/special_*.png` (`256x256`).
- Icons tooltip: `apps/game/public/assets/special/special_*_icon.png` (`64x64`).
- Icons tài nguyên thường tiếp tục dùng chung `RESOURCE_META` với HUD.

Tooltip chỉ hiển thị tài nguyên có sản lượng lớn hơn 0. Dữ liệu server giữ đơn vị mỗi giây, còn giao diện quy đổi thành mỗi giờ và mỗi ngày để người chơi dễ đọc.
