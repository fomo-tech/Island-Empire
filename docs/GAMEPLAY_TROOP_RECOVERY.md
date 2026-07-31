# Cơ chế bổ sung quân và chinh phạt vượt biển

## Bổ sung quân tự động

- Không còn API mộ binh thủ công. `POST /api/game/recruit` trả HTTP 410.
- Mỗi lãnh thổ tự bổ sung một đơn vị theo chu kỳ cấu hình, mặc định 600 giây.
- Đất thường bổ sung bộ binh, `Bãi ngựa` bổ sung kị binh, `Xưởng đúc pháo` bổ sung pháo binh.
- Mỗi đơn vị vẫn tiêu hao chi phí tài nguyên tương ứng trong cấu hình server.
- Khi offline, server bù tối đa `troopRecoveryOfflineLimit` lượt cho mỗi lần xử lý.
- Hồi quân tạm dừng khi kho tài nguyên không đủ, sức chứa đã đầy, lãnh thổ đang giao tranh hoặc bị cô lập khỏi Hoàng Thành.

## Sức chứa quân

- Dân số là sức chứa quân cơ sở và không bị trừ khi bổ sung quân.
- Hoàng Thành và Trung Tâm Thành Trì dùng `capitalTroopCapacityMultiplier`, mặc định x2 dân số.
- Pháo đài dùng `strongholdTroopCapacityMultiplier`, mặc định x1 dân số.
- Quân đã xuất hành vẫn chiếm sức chứa tại nơi xuất phát cho tới khi tới đích hoặc trận đánh kết thúc.
- Tooltip và Quản lý thành hiển thị đồn trú, hành quân, tổng sức chứa, loại quân đang bổ sung, chi phí và thời gian còn lại.

## Chinh phạt lục địa khác

- Từ đảo có thể đi biển tới mọi đảo hoặc vùng ven biển, không quét và không giới hạn bán kính.
- Không thể dùng đảo để dựng pháo đài trực tiếp trên vùng đất nằm sâu trong lục địa.
- Chiếm vùng ven biển sẽ tạo đầu cầu có `connectionType: "sea"`; từ đầu cầu chỉ được mở rộng qua từng vùng đất giáp ranh.
- Một đầu cầu ven biển không cho phép nhảy tiếp sang vùng ven biển xa khác.
- Khi tuyến biển bị cắt, chuỗi hải ngoại vẫn thuộc người chơi nhưng chuyển sang trạng thái cô lập và dừng bổ sung quân. Chuỗi đất liền bị cắt vẫn bị phá hủy theo luật hiện tại.

## Realtime và reload

- Worker server quét quân đến hạn mỗi 5 giây và lưu town/resources trước khi phát socket.
- `troop_recovery_updated` cập nhật quân, tài nguyên, sức chứa và lý do tạm dừng.
- `battle_state_updated` phát máu công/thủ theo `battleStateBroadcastSeconds`, mặc định 2 giây.
- Reload lấy lại town, hành quân, giao tranh và mốc hồi quân từ `/api/player/sync`; client không tự đoán kết quả.

## Cấu hình Admin

- `troopRecoveryEnabled`
- `troopRecoverySeconds`
- `troopRecoveryOfflineLimit`
- `capitalTroopCapacityMultiplier`
- `strongholdTroopCapacityMultiplier`
- `battleStateBroadcastSeconds`
