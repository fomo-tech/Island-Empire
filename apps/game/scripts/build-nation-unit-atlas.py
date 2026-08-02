from colorsys import rgb_to_hsv, hsv_to_rgb
from pathlib import Path
from statistics import median
import subprocess
import tempfile

from PIL import Image


ROOT = Path(__file__).resolve().parents[1] / "public" / "assets" / "units" / "medieval"
CELL = 96
NATION_BLOCK_HEIGHT = CELL * 4
DIRECTIONS = {
    "S": (0, 0), "SW": (0, 1), "W": (1, 0), "NW": (1, 1),
    "N": (2, 0), "NE": (2, 1), "E": (3, 0), "SE": (3, 1),
}
SPECS = [
    ("infantry", "medieval_infantry_8dir.webp", 6),
    ("cavalry", "medieval_cavalry_8dir.webp", 8),
    ("artillery", "medieval_artillery_8dir.webp", 6),
    ("builder", "medieval_builder_8dir.webp", 6),
    ("ship", "medieval_ship_8dir.webp", 6),
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


def source_pair(sheet: Image.Image, row: int, pair: int) -> tuple[Image.Image, Image.Image]:
    frames = []
    for frame in range(2):
        column = pair * 2 + frame
        crop = sheet.crop((column * 256, row * 256, (column + 1) * 256, (row + 1) * 256))
        frames.append(crop.resize((CELL, CELL), Image.Resampling.LANCZOS))
    return frames[0], frames[1]


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


def interpolate_cycle(first: Image.Image, second: Image.Image, frame_count: int, target_y: int) -> list[Image.Image]:
    with tempfile.TemporaryDirectory(prefix="nation-unit-") as temp_name:
        temp = Path(temp_name)
        keys = (first, second, first, second)
        for index, frame in enumerate(keys):
            rgb_on_black(frame).save(temp / f"rgb_{index}.png")
            frame.getchannel("A").save(temp / f"alpha_{index}.png")

        filter_value = f"minterpolate=fps={frame_count}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"
        for channel in ("rgb", "alpha"):
            subprocess.run([
                "ffmpeg", "-loglevel", "error", "-framerate", "2",
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


def build_generic_cycles() -> tuple[dict[str, dict[str, list[Image.Image]]], dict[str, int]]:
    cycles = {}
    offsets = {}
    column_offset = 0
    for kind, filename, frame_count in SPECS:
        offsets[kind] = column_offset
        column_offset += frame_count * 2
        sheet = Image.open(ROOT / filename).convert("RGBA")
        cycles[kind] = {}
        for direction, (row, pair) in DIRECTIONS.items():
            first, second = source_pair(sheet, row, pair)
            target_y = CELL - 2
            cycles[kind][direction] = interpolate_cycle(first, second, frame_count, target_y)
    offsets["builder_action"] = column_offset
    return cycles, offsets


def main() -> None:
    cycles, offsets = build_generic_cycles()
    total_columns = offsets["builder_action"] + 7
    atlas = Image.new("RGBA", (total_columns * CELL, NATION_BLOCK_HEIGHT * 8))
    builder_actions = Image.open(ROOT / "medieval_builder.webp").convert("RGBA")

    for nation_index, color in enumerate(NATION_COLORS):
        nation_y = nation_index * NATION_BLOCK_HEIGHT
        for kind, _, frame_count in SPECS:
            for direction, (row, pair) in DIRECTIONS.items():
                for frame_index, frame in enumerate(cycles[kind][direction]):
                    x = (offsets[kind] + pair * frame_count + frame_index) * CELL
                    y = nation_y + row * CELL
                    atlas.alpha_composite(recolor_blue_cloth(frame, color), (x, y))

        for frame_index in range(7):
            frame = builder_actions.crop((frame_index * 384, 0, (frame_index + 1) * 384, 384))
            frame = frame.resize((CELL, CELL), Image.Resampling.LANCZOS)
            frame = stabilize_cycle([frame], CELL - 2)[0]
            x = (offsets["builder_action"] + frame_index) * CELL
            atlas.alpha_composite(recolor_blue_cloth(frame, color), (x, nation_y))

    atlas.save(ROOT / "nation_units_8.webp", "WEBP", lossless=True, method=6)
    print({"size": atlas.size, "cell": CELL, "offsets": offsets})


if __name__ == "__main__":
    main()
