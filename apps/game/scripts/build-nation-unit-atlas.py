from colorsys import rgb_to_hsv, hsv_to_rgb
from collections import deque
from math import cos, pi
from pathlib import Path
from statistics import median
import subprocess
import tempfile

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1] / "public" / "assets" / "units" / "medieval"
CELL = 64
NATION_BLOCK_HEIGHT = CELL * 4
DIRECTIONS = {
    "S": (0, 0), "SW": (0, 1), "W": (1, 0), "NW": (1, 1),
    "N": (2, 0), "NE": (2, 1), "E": (3, 0), "SE": (3, 1),
}
MOVE_SPECS = [
    ("infantry", "medieval_infantry_move_8dir_v2.png", 16),
    ("cavalry", "medieval_cavalry_move_8dir_v2.png", 16),
    ("artillery", "medieval_artillery_move_8dir_v2.png", 16),
    ("builder", "medieval_builder_move_8dir_v2.png", 16),
    ("ship", "medieval_ship_move_8dir_v2.png", 16),
]
ATTACK_SPECS = [
    ("infantry", "medieval_infantry_attack_8dir.png", 8),
    ("cavalry", "medieval_cavalry_attack_8dir.png", 10),
    ("artillery", "medieval_artillery_attack_8dir.png", 8),
    ("ship", "medieval_ship_attack_8dir.png", 8),
]
NATION_COLORS = [
    (179, 38, 30), (211, 58, 34), (37, 63, 109), (185, 28, 28),
    (21, 94, 117), (190, 24, 49), (29, 78, 216), (159, 18, 57),
]


def recolor_blue_cloth(image: Image.Image, target: tuple[int, int, int]) -> Image.Image:
    pixels = image.convert("RGBA")
    data = []
    target_h, target_s, _ = rgb_to_hsv(*(channel / 255 for channel in target))
    for red, green, blue, alpha in pixels.getdata():
        if alpha == 0:
            data.append((0, 0, 0, 0))
            continue
        _, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
        is_blue_cloth = saturation > 0.18 and blue > red * 1.05 and blue > green * 1.02
        if is_blue_cloth:
            nr, ng, nb = hsv_to_rgb(target_h, max(saturation, target_s * 0.72), value)
            data.append((round(nr * 255), round(ng * 255), round(nb * 255), alpha))
        else:
            data.append((red, green, blue, alpha))
    pixels.putdata(data)
    return pixels


def isolate_primary_subject(frame: Image.Image) -> Image.Image:
    alpha = frame.getchannel("A")
    width, height = alpha.size
    values = list(alpha.getdata())
    visited = bytearray(width * height)
    components = []
    threshold = 72
    for start, value in enumerate(values):
        if visited[start] or value < threshold:
            continue
        queue = deque([start])
        visited[start] = 1
        pixels = []
        touches_border = False
        while queue:
            current = queue.popleft()
            pixels.append(current)
            x, y = current % width, current // width
            touches_border |= x == 0 or y == 0 or x == width - 1 or y == height - 1
            for neighbor in (current - 1, current + 1, current - width, current + width):
                if neighbor < 0 or neighbor >= width * height or visited[neighbor]:
                    continue
                nx, ny = neighbor % width, neighbor // width
                if abs(nx - x) + abs(ny - y) != 1 or values[neighbor] < threshold:
                    continue
                visited[neighbor] = 1
                queue.append(neighbor)
        components.append((touches_border, pixels))

    candidates = [pixels for touches, pixels in components if not touches]
    if not candidates:
        candidates = [pixels for _, pixels in components]
    if not candidates:
        return frame
    primary = max(candidates, key=len)
    selection = Image.new("L", alpha.size)
    selection_data = bytearray(width * height)
    for index in primary:
        selection_data[index] = 255
    selection.frombytes(bytes(selection_data))
    selection = selection.filter(ImageFilter.MaxFilter(5))
    cleaned_alpha = Image.new("L", alpha.size)
    cleaned_alpha.putdata([
        original if keep else 0
        for original, keep in zip(values, selection.getdata())
    ])
    output = frame.copy()
    output.putalpha(cleaned_alpha)
    return output


def normalize_source_frame(frame: Image.Image) -> Image.Image:
    frame = isolate_primary_subject(frame)
    bbox = frame.getchannel("A").getbbox()
    if not bbox:
        return Image.new("RGBA", (CELL, CELL))
    subject = frame.crop(bbox)
    # Chroma removal leaves key-colour RGB below fully transparent pixels.
    # Premultiplying onto black before resize prevents those hidden colours
    # from becoming long red/green streaks during tweening.
    alpha = subject.getchannel("A")
    clean_rgb = Image.new("RGB", subject.size)
    clean_rgb.paste(subject.convert("RGB"), mask=alpha)
    clean_rgb.putalpha(alpha)
    subject = clean_rgb
    scale = min((CELL - 4) / subject.width, (CELL - 3) / subject.height)
    size = (
        max(1, round(subject.width * scale)),
        max(1, round(subject.height * scale)),
    )
    subject = subject.resize(size, Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (CELL, CELL))
    output.alpha_composite(subject, ((CELL - size[0]) // 2, CELL - 2 - size[1]))
    return output


def source_keyframes(
    sheet: Image.Image,
    row: int,
    pair: int,
    keyframe_count: int,
) -> list[Image.Image]:
    source_cell_height = sheet.height // 4
    row_image = sheet.crop((
        0,
        row * source_cell_height,
        sheet.width,
        (row + 1) * source_cell_height,
    ))
    alpha = row_image.getchannel("A")
    active_columns = []
    for x in range(alpha.width):
        active = sum(
            1 for y in range(alpha.height)
            if alpha.getpixel((x, y)) >= 72
        ) >= 5
        active_columns.append(active)
    runs = []
    start = None
    for x, active in enumerate((*active_columns, False)):
        if active and start is None:
            start = x
        elif not active and start is not None:
            if x - start >= 12:
                runs.append((start, x))
            start = None

    expected = keyframe_count * 2
    if len(runs) != expected:
        values = list(alpha.getdata())
        visited = bytearray(alpha.width * alpha.height)
        components = []
        for start, value in enumerate(values):
            if visited[start] or value < 96:
                continue
            queue = deque([start])
            visited[start] = 1
            pixels = []
            while queue:
                current = queue.popleft()
                pixels.append(current)
                x, y = current % alpha.width, current // alpha.width
                for neighbor in (current - 1, current + 1, current - alpha.width, current + alpha.width):
                    if neighbor < 0 or neighbor >= alpha.width * alpha.height or visited[neighbor]:
                        continue
                    nx, ny = neighbor % alpha.width, neighbor // alpha.width
                    if abs(nx - x) + abs(ny - y) != 1 or values[neighbor] < 96:
                        continue
                    visited[neighbor] = 1
                    queue.append(neighbor)
            if len(pixels) >= 100:
                xs = [pixel % alpha.width for pixel in pixels]
                components.append((len(pixels), (min(xs) + max(xs)) / 2))
        centers = sorted(center for _, center in sorted(components, reverse=True)[:expected])
        if len(centers) == expected:
            boundaries = [0]
            boundaries.extend(round((centers[index] + centers[index + 1]) / 2) for index in range(expected - 1))
            boundaries.append(alpha.width)
            runs = list(zip(boundaries, boundaries[1:]))
        else:
            source_cell_width = sheet.width // expected
            runs = [
                (column * source_cell_width, (column + 1) * source_cell_width)
                for column in range(expected)
            ]

    frames = []
    for frame in range(keyframe_count):
        column = pair * keyframe_count + frame
        left, right = runs[column]
        crop = row_image.crop((max(0, left - 3), 0, min(row_image.width, right + 3), row_image.height))
        frames.append(normalize_source_frame(crop))
    return frames


def rgb_on_black(frame: Image.Image) -> Image.Image:
    output = Image.new("RGB", frame.size)
    output.paste(frame.convert("RGB"), mask=frame.getchannel("A"))
    return output


def align_to_foot(frame: Image.Image, target_y: int) -> Image.Image:
    alpha = frame.getchannel("A")
    center_margin = round(frame.width * 0.18)
    center = alpha.crop((center_margin, 0, frame.width - center_margin, frame.height))
    bbox = center.getbbox() or alpha.getbbox()
    if not bbox:
        return frame
    shift_y = target_y - (bbox[3] - 1)
    output = Image.new("RGBA", frame.size)
    output.alpha_composite(frame, (0, shift_y))
    return output


def central_bbox(frame: Image.Image):
    alpha = frame.getchannel("A")
    margin = round(frame.width * 0.18)
    bbox = alpha.crop((margin, 0, frame.width - margin, frame.height)).getbbox()
    if bbox:
        return (bbox[0] + margin, bbox[1], bbox[2] + margin, bbox[3])
    return alpha.getbbox()


def stabilize_cycle(frames: list[Image.Image], foot_y: int) -> list[Image.Image]:
    aligned = [align_to_foot(frame, foot_y) for frame in frames]
    boxes = [central_bbox(frame) for frame in aligned]
    valid = [box for box in boxes if box]
    if not valid:
        return aligned

    target_top = round(median(box[1] for box in valid))
    target_height = max(1, foot_y - target_top + 1)
    stabilized = []
    for frame, box in zip(aligned, boxes):
        if not box:
            stabilized.append(frame)
            continue
        source_top = box[1]
        source_bottom = min(frame.height, foot_y + 1)
        strip = frame.crop((0, source_top, frame.width, source_bottom))
        strip = strip.resize((frame.width, target_height), Image.Resampling.LANCZOS)
        output = Image.new("RGBA", frame.size)
        output.alpha_composite(strip, (0, target_top))
        stabilized.append(output)
    return stabilized


def interpolate_frames(
    source_frames: list[Image.Image],
    frame_count: int,
    target_y: int,
    action: bool = False,
) -> list[Image.Image]:
    if not action:
        frames = []
        keyframe_count = len(source_frames)
        for index in range(frame_count):
            position = index * keyframe_count / frame_count
            left = int(position) % keyframe_count
            right = (left + 1) % keyframe_count
            linear_t = position - int(position)
            eased_t = 0.5 - 0.5 * cos(pi * linear_t)
            frames.append(Image.blend(source_frames[left], source_frames[right], eased_t))
        return stabilize_cycle(frames, target_y)

    with tempfile.TemporaryDirectory(prefix="nation-unit-") as temp_name:
        temp = Path(temp_name)
        first, second = source_frames
        keys = (first, first, second, second, first)
        input_fps = 2
        for index, frame in enumerate(keys):
            rgb_on_black(frame).save(temp / f"rgb_{index}.png")
            frame.getchannel("A").save(temp / f"alpha_{index}.png")

        filter_value = f"minterpolate=fps={frame_count}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"
        for channel in ("rgb", "alpha"):
            subprocess.run([
                "ffmpeg", "-loglevel", "error", "-framerate", str(input_fps),
                "-i", str(temp / f"{channel}_%d.png"), "-vf", filter_value,
                "-frames:v", str(frame_count), str(temp / f"{channel}_out_%02d.png"),
            ], check=True)

        frames = []
        for index in range(1, frame_count + 1):
            rgb = Image.open(temp / f"rgb_out_{index:02d}.png").convert("RGB")
            alpha = Image.open(temp / f"alpha_out_{index:02d}.png").convert("L")
            rgb.putalpha(alpha)
            frames.append(rgb)
        return stabilize_cycle(frames, target_y)


def build_cycles(specs, action: bool = False) -> tuple[dict[str, dict[str, list[Image.Image]]], dict[str, int], int]:
    cycles = {}
    offsets = {}
    column_offset = 0
    for kind, filename, frame_count in specs:
        offsets[kind] = column_offset
        column_offset += frame_count * 2
        sheet = Image.open(ROOT / filename).convert("RGBA")
        cycles[kind] = {}
        keyframe_count = 2 if action else 4
        for direction, (row, pair) in DIRECTIONS.items():
            source_frames = source_keyframes(sheet, row, pair, keyframe_count)
            target_y = CELL - 2
            cycles[kind][direction] = interpolate_frames(
                source_frames,
                frame_count,
                target_y,
                action=action,
            )
    return cycles, offsets, column_offset


def builder_work_cycle(frame_count: int) -> list[Image.Image]:
    sheet = Image.open(ROOT / "medieval_builder.webp").convert("RGBA")
    source_count = max(1, sheet.width // sheet.height)
    source_frames = []
    for index in range(source_count):
        frame = sheet.crop((index * sheet.height, 0, (index + 1) * sheet.height, sheet.height))
        source_frames.append(frame.resize((CELL, CELL), Image.Resampling.LANCZOS))
    output = []
    for index in range(frame_count):
        progress = index * (source_count - 1) / max(1, frame_count - 1)
        left = int(progress)
        right = min(source_count - 1, left + 1)
        output.append(Image.blend(source_frames[left], source_frames[right], progress - left))
    return stabilize_cycle(output, CELL - 2)


def composite_cycles(atlas, cycles, offsets, specs, nation_index, color):
    nation_y = nation_index * NATION_BLOCK_HEIGHT
    for kind, _, frame_count in specs:
        for direction, (row, pair) in DIRECTIONS.items():
            for frame_index, frame in enumerate(cycles[kind][direction]):
                x = (offsets[kind] + pair * frame_count + frame_index) * CELL
                y = nation_y + row * CELL
                atlas.alpha_composite(recolor_blue_cloth(frame, color), (x, y))


def main() -> None:
    move_cycles, move_offsets, move_columns = build_cycles(MOVE_SPECS)
    attack_cycles, attack_offsets, attack_columns_without_builder = build_cycles(
        ATTACK_SPECS,
        action=True,
    )
    builder_frame_count = 8
    attack_offsets["builder"] = attack_columns_without_builder
    attack_columns = attack_columns_without_builder + builder_frame_count * 2
    movement_atlas = Image.new("RGBA", (move_columns * CELL, NATION_BLOCK_HEIGHT * 8))
    attack_atlas = Image.new("RGBA", (attack_columns * CELL, NATION_BLOCK_HEIGHT * 8))
    builder_frames = builder_work_cycle(builder_frame_count)

    for nation_index, color in enumerate(NATION_COLORS):
        composite_cycles(
            movement_atlas,
            move_cycles,
            move_offsets,
            MOVE_SPECS,
            nation_index,
            color,
        )
        composite_cycles(
            attack_atlas,
            attack_cycles,
            attack_offsets,
            ATTACK_SPECS,
            nation_index,
            color,
        )
        nation_y = nation_index * NATION_BLOCK_HEIGHT
        for row in range(4):
            for pair in range(2):
                for frame_index, frame in enumerate(builder_frames):
                    x = (attack_offsets["builder"] + pair * builder_frame_count + frame_index) * CELL
                    y = nation_y + row * CELL
                    attack_atlas.alpha_composite(recolor_blue_cloth(frame, color), (x, y))

    movement_atlas.save(ROOT / "nation_units_8.webp", "WEBP", lossless=True, method=6)
    attack_atlas.save(ROOT / "nation_units_attack_8.webp", "WEBP", lossless=True, method=6)
    print({
        "movement_size": movement_atlas.size,
        "attack_size": attack_atlas.size,
        "cell": CELL,
        "move_offsets": move_offsets,
        "attack_offsets": attack_offsets,
    })


if __name__ == "__main__":
    main()
