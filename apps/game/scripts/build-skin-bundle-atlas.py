from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT.parents[1]
SOURCE = PROJECT / "assets/skin-production/processed"
OUTPUT = ROOT / "public/assets/kingdoms/skins"
SPRITES = PROJECT / "assets/skin-production/sprites"
SKINS = [
    "golden-empire",
    "fire-dragon",
    "ice-king",
    "celestial-sky",
    "dark-moon",
]
KINDS = ["capital", "district", "flag"]
HEIGHTS = {"capital": 488, "district": 488, "flag": 488}
CELL = 512


def find_separator(alpha: Image.Image, start_ratio: float, end_ratio: float) -> int:
    start = round(alpha.width * start_ratio)
    end = round(alpha.width * end_ratio)
    counts = []
    for x in range(start, end):
        column = alpha.crop((x, 0, x + 1, alpha.height))
        values = column.get_flattened_data() if hasattr(column, "get_flattened_data") else column.getdata()
        counts.append(sum(1 for value in values if value > 20))
    threshold = max(2, round(alpha.height * 0.008))
    best_start = best_end = run_start = start
    in_run = False
    for offset, count in enumerate(counts):
        x = start + offset
        if count <= threshold and not in_run:
            run_start, in_run = x, True
        if count > threshold and in_run:
            if x - run_start > best_end - best_start:
                best_start, best_end = run_start, x
            in_run = False
    if in_run and end - run_start > best_end - best_start:
        best_start, best_end = run_start, end
    return (best_start + best_end) // 2


def fit_sprite(image: Image.Image, target_height: int) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if not bounds:
        raise RuntimeError("Generated sheet contains an empty sprite cell")
    sprite = image.crop(bounds)
    scale = min((CELL - 18) / sprite.width, target_height / sprite.height)
    size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
    sprite = sprite.resize(size, Image.Resampling.LANCZOS)
    cell = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    x = (CELL - sprite.width) // 2
    y = CELL - 10 - sprite.height
    cell.alpha_composite(sprite, (x, y))
    return cell


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    SPRITES.mkdir(parents=True, exist_ok=True)
    atlas = Image.new("RGBA", (CELL * len(SKINS), CELL * len(KINDS)), (0, 0, 0, 0))
    flag_sheet = Image.open(SOURCE / "premium-flags-sheet.png").convert("RGBA")
    for skin_index, skin in enumerate(SKINS):
        sheet = Image.open(SOURCE / f"{skin}-sheet.png").convert("RGBA")
        alpha = sheet.getchannel("A")
        first_separator = find_separator(alpha, 0.34, 0.47)
        second_separator = find_separator(alpha, 0.67, 0.84)
        ranges = ((0, first_separator), (first_separator, second_separator), (second_separator, sheet.width))
        for kind_index, (kind, bounds) in enumerate(zip(KINDS, ranges)):
            if kind == "flag":
                left = round(flag_sheet.width * skin_index / len(SKINS))
                right = round(flag_sheet.width * (skin_index + 1) / len(SKINS))
                segment = flag_sheet.crop((left, 0, right, flag_sheet.height))
            else:
                left, right = bounds
                segment = sheet.crop((left, 0, right, sheet.height))
            sprite = fit_sprite(segment, HEIGHTS[kind])
            sprite.save(SPRITES / f"{skin}-{kind}.png", optimize=True)
            atlas.alpha_composite(sprite, (skin_index * CELL, kind_index * CELL))
    atlas.save(
        OUTPUT / "kingdom-skin-bundles.webp",
        format="WEBP",
        lossless=True,
        method=6,
    )


if __name__ == "__main__":
    main()
