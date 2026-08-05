Đúng, `6 frame` chưa đủ để nhìn rõ chu kỳ hai chân. Cần sửa kế hoạch thành animation di chuyển riêng, nhiều frame hơn và tách atlas tấn công để không ép hình.

## Số frame chuẩn mới

| Unit | Di chuyển | Tấn công/hành động | FPS |
|---|---:|---:|---:|
| Bộ binh | 12 frame | 8 frame | 10–12 |
| Kỵ binh | 12 frame | 10 frame | 12–14 |
| Pháo binh | 10 frame | 8 frame | 8–10 |
| Công nhân | 10 frame | 8 frame xây | 9–10 |
| Thuyền | 8 frame | 8 frame bắn | 7–9 |

### Chu kỳ 12 frame bước chân bộ binh

1. Chân trái tiếp đất.
2. Cơ thể hạ thấp.
3. Chân phải bắt đầu vượt.
4. Hai chân đi ngang nhau.
5. Chân trái đẩy thân về trước.
6. Chân phải chuẩn bị chạm đất.
7. Chân phải tiếp đất.
8. Cơ thể hạ thấp.
9. Chân trái bắt đầu vượt.
10. Hai chân đi ngang nhau.
11. Chân phải đẩy thân về trước.
12. Chân trái chuẩn bị chạm đất.

Không được tạo 12 frame bằng cách lặp lại hình. Mỗi frame phải thay đổi:

- Vị trí hai bàn chân.
- Góc đầu gối.
- Độ nâng cơ thể.
- Chuyển động tay và vũ khí ngược pha với chân.
- Áo choàng, khiên và phụ kiện trễ hơn thân 1–2 frame.

### Chu kỳ kỵ binh 12 frame

Kỵ binh cần animate riêng cả ngựa và người:

- Duỗi chân trước.
- Chạm đất.
- Nén thân.
- Hai chân gom dưới bụng.
- Đẩy thân.
- Bay ngắn.
- Lặp lại với chuyển động đối xứng.

Người cưỡi không được đứng yên trên ngựa; thân phải nhún theo nhịp nhưng đầu không rung quá mạnh.

## Tách thành hai atlas

Không nên nhét toàn bộ walk và attack vào một ảnh vì chiều rộng sẽ vượt giới hạn an toàn.

### Atlas di chuyển

```text
nation_units_8.webp
```

- Cell: `64×64`.
- 8 quốc gia.
- 4 hàng hướng cho mỗi quốc gia.
- Mỗi hàng chứa hai hướng.
- Kích thước: `10240×2048`.
- Chứa toàn bộ `walk/sail`.

### Atlas tấn công

```text
nation_units_attack_8.webp
```

- Cell: `64×64`.
- Mapping quốc gia và hướng giống atlas di chuyển.
- Kích thước dự kiến: `5376×2048`.
- Chứa `attack/fire/work`.

Cách này cho phép tải atlas tấn công sau khi game đã vào bản đồ hoặc khi xuất hiện giao tranh, giảm thời gian tải ban đầu.

## Chống trượt chân

Mỗi frame phải dùng chung:

```ts
pivotX = 32;
pivotY = 62;
```

Engine không di chuyển sprite theo dao động cơ thể. Phần nhún lên xuống phải được vẽ bên trong cell; điểm đặt chân ngoài bản đồ luôn giữ nguyên.

Cần thêm kiểm tra tự động:

- Sai lệch tâm giữa các frame tối đa `1 px`.
- Bàn chân tiếp đất không được dịch quá `1 px` trong contact phase.
- Chiều cao đầu thay đổi tối đa `3 px`.
- Vũ khí không vượt khỏi cell.
- Alpha không chạm mép ảnh.

## Chuyển trạng thái mượt

```text
idle → walk: bắt đầu từ frame chân gần nhất
walk → attack: kết thúc bước hiện tại rồi vào prepare
attack → walk: trở về recovery rồi tiếp tục đúng chân
```

Không reset về frame `0` mỗi khi đổi hướng. Khi đổi hướng, giữ nguyên tỷ lệ tiến trình bước chân để quân không bị giật.

Phần atlas sẽ được tách khỏi [engine.ts](/Users/nguyenthanhloc/Projects/hexrivals.com/apps/game/src/game/engine.ts:180) thành `unitAtlas.ts` và `unitAnimator.ts`.

## Trạng thái triển khai animation quân đội

- Movement atlas đã nâng thành `10240×2048`, cell `64×64`.
- Cả bộ binh, kỵ binh, pháo binh, công nhân và thuyền có 16 frame di chuyển mỗi hướng.
- Mỗi hướng bắt đầu từ 4 key-pose thật, gồm đủ contact trái, hạ trọng tâm, contact phải và đẩy chân; chu kỳ không còn dựng từ một bước chân rồi lặp lại.
- Nguồn movement của cả 5 loại unit đã được vẽ lại thành grid 4×4: mỗi hướng có hai contact-pose đối nghịch thật (chân trái/chân phải, vó trước/vó sau hoặc thân tàu/cờ buồm lệch pha). Atlas không còn lấy frame từ các sprite cũ bị kéo giãn.
- Mọi frame movement được ổn định theo cùng điểm đặt chân trước khi đóng atlas, nên đổi frame không làm unit nảy hoặc trượt khỏi đường hành quân.
- Attack atlas mới có kích thước `5376×2048`.
- Bộ binh có 8 frame đánh; kỵ binh 10 frame; pháo, công nhân và thuyền 8 frame hành động.
- Source action bộ binh, kỵ binh, pháo và thuyền được dựng theo grid 4×4, tách chroma thành alpha trước khi đóng atlas.
- `engine/unitAtlas.ts` sở hữu việc tải atlas, kiểm tra kích thước, ánh xạ hướng và chọn source frame.
- `engine/unitAnimator.ts` sở hữu phase bước chân theo thời gian/quãng đường và phase tấn công.
- `engine.ts` chỉ chọn trạng thái `walk`, `attack` hoặc `work` và gọi renderer.
- Siege dùng attack atlas; hành quân dùng movement atlas.
- Script `build-nation-unit-atlas.py` là nguồn duy nhất để tái tạo hai atlas, không ghép tay.

### Kích thước và mapping đã khóa

| Atlas | Cell | Kích thước | Nội dung |
|---|---:|---:|---|
| `nation_units_8.webp` | 64×64 | 10240×2048 | walk/sail tám hướng, 16 frame/hướng |
| `nation_units_attack_8.webp` | 64×64 | 5376×2048 | attack/fire/work tám hướng |

Điểm neo runtime là `x=32`, `y=62`. Mọi frame phải giữ nhân vật và phương tiện quanh điểm neo này; bóng chân tiếp tục do Canvas vẽ và không được bake vào sprite.
