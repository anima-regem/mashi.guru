"""Offline, deterministic font intake and static site builder. Never executes submissions."""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import sys
import unicodedata
import zipfile
from pathlib import Path
from urllib.parse import urlsplit

from fontTools.ttLib import TTFont
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
MAX_FONT = 3 * 1024 * 1024
MAX_FAMILY = 8 * 1024 * 1024
MAX_COLLECTION = 64 * 1024 * 1024
SAMPLE = "മലയാളം"


class InvalidFont(ValueError):
    pass


def fail(message):
    raise InvalidFont(message)


def read_json(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                fail(f"{path}: duplicate JSON key {key!r}")
            result[key] = value
        return result
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique)


def safe_url(value):
    u = urlsplit(value)
    if (u.scheme != "https" or not u.hostname or u.username or u.password
            or u.port not in (None, 443) or "\\" in value
            or any(ord(c) < 33 for c in value)):
        fail("External links must be plain HTTPS URLs, without credentials or unusual ports")


def check_text(value):
    if isinstance(value, dict):
        for v in value.values():
            check_text(v)
    elif isinstance(value, list):
        for v in value:
            check_text(v)
    elif isinstance(value, str):
        if any(unicodedata.category(c) == "Cc" or c in "<>" or ord(c) in range(0x202a, 0x202f) for c in value):
            fail("Metadata must be plain text without HTML or control characters")


def validate(fonts=ROOT / "fonts"):
    fonts = Path(fonts)
    if fonts.is_symlink() or not fonts.is_dir():
        fail("Font root must be a real directory")
    # Reject links before opening any file, even ignored/unreferenced files.
    for p in fonts.rglob("*"):
        if p.is_symlink() or not (p.is_file() or p.is_dir()):
            fail(f"Symlink/special file is not allowed: {p.name}")
    schema = read_json(ROOT / "schema/font.schema.json")
    validator = Draft202012Validator(schema)
    families, names, hashes, total = [], set(), set(), 0
    folders = sorted(fonts.iterdir())
    if len(folders) > 100:
        fail("Collection exceeds 100 families; increase limits only after maintainer review")
    for folder in folders:
        if not folder.is_dir() or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", folder.name):
            fail(f"Expected a slug directory: {folder.name}")
        contents = list(folder.iterdir())
        if len(contents) > 10 or any(not p.is_file() for p in contents):
            fail(f"{folder.name}: flat font folders only, at most 10 files")
        if any(p.stat().st_size > MAX_FONT for p in contents):
            fail(f"{folder.name}: a file exceeds 3 MiB")
        size = sum(p.stat().st_size for p in contents)
        total += size
        if size > MAX_FAMILY or total > MAX_COLLECTION:
            fail("Family or collection size limit exceeded")
        metadata = folder / "metadata.json"
        if not metadata.is_file() or metadata.stat().st_size > 16384:
            fail(f"{folder.name}: metadata.json missing or exceeds 16 KiB")
        data = read_json(metadata)
        errors = sorted(validator.iter_errors(data), key=lambda e: str(e.path))
        if errors:
            fail(f"{folder.name}: {errors[0].message}")
        check_text(data)
        if data["slug"] != folder.name:
            fail("Slug must exactly match its directory")
        for key in ("name", "family"):
            norm = (key, unicodedata.normalize("NFC", data[key]).casefold())
            if norm in names:
                fail(f"Duplicate {key}: {data[key]}")
            names.add(norm)
        safe_url(data["source"])
        if "url" in data["author"]:
            safe_url(data["author"]["url"])
        expected = {"metadata.json", data["licenseFile"], data["noticeFile"]}
        if data["licenseFile"] == data["noticeFile"]:
            fail("Include distinct complete licence and attribution/notice files")
        for key in ("licenseFile", "noticeFile"):
            p = folder / data[key]
            if not p.is_file() or not 20 <= p.stat().st_size <= 65536:
                fail(f"{folder.name}: missing/oversize/empty licence or notices")
            text = p.read_text(encoding="utf-8")
            if "\x00" in text or "<script" in text.lower():
                fail("Notices must be plain UTF-8 text")
            if key == "licenseFile":
                marker = {"OFL-1.1": "SIL OPEN FONT LICENSE Version 1.1",
                          "Apache-2.0": "Apache License", "CC0-1.0": "CC0"}[data["license"]]
                if marker not in text:
                    fail("Licence identifier does not match licence text")
        seen_files, seen_styles = set(), set()
        for asset in data["files"]:
            filename = asset["file"]
            style = (asset["style"].casefold(), asset["weight"])
            if filename in seen_files or style in seen_styles:
                fail("Duplicate file/style entry")
            seen_files.add(filename)
            seen_styles.add(style)
            expected.add(filename)
            safe_url(asset["sourceUrl"])
            if data["revision"] not in urlsplit(asset["sourceUrl"]).path.split("/"):
                fail("Asset source URL must contain the pinned 40-character revision")
            path = folder / filename
            if not path.is_file():
                fail(f"Missing font: {filename}")
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            if digest != asset["sha256"] or digest in hashes:
                fail(f"Hash mismatch or duplicated font: {filename}")
            hashes.add(digest)
            try:
                with path.open("rb") as f:
                    signature = f.read(4)
                if signature not in (b"\x00\x01\x00\x00", b"OTTO"):
                    fail("Only standalone, uncompressed OpenType/TrueType fonts are accepted")
                if (path.suffix == ".otf") != (signature == b"OTTO"):
                    fail("Font extension must match its binary format")
                with TTFont(path, lazy=False, checkChecksums=2, ignoreDecompileErrors=False) as font:
                    font.ensureDecompiled()
                    if len(font.getGlyphOrder()) > 12000:
                        fail("Font exceeds 12,000 glyph limit")
                    cmap = font.getBestCmap() or {}
                    if len([cp for cp in cmap if 0x0d00 <= cp <= 0x0d7f]) < 20:
                        fail("Font must contain Malayalam Unicode characters")
                    family = font["name"].getDebugName(16) or font["name"].getDebugName(1)
                    version = font["name"].getDebugName(5) or ""
                    subfamily = font["name"].getDebugName(17) or font["name"].getDebugName(2)
                    if family != data["family"] or version != data["version"] or subfamily != asset["style"]:
                        fail("Family, version and style must match the embedded font names")
                    if font["OS/2"].usWeightClass != asset["weight"]:
                        fail("Weight must match the font's OS/2 weight")
                    if font["OS/2"].fsType & 0x0002:
                        fail("Font reports restricted embedding; resolve licensing before submission")
            except InvalidFont:
                raise
            except Exception as error:
                fail(f"{filename}: font parser rejected file ({type(error).__name__})")
        if data["preview"] not in seen_files:
            fail("Preview must be one of the submitted font files")
        if {p.name for p in contents} != expected:
            fail(f"{folder.name}: unexpected or missing files; only declared assets are allowed")
        families.append(data)
    return sorted(families, key=lambda f: f["name"].casefold())


def archive(folder, data, target):
    filenames = sorted({a["file"] for a in data["files"]} | {data["licenseFile"], data["noticeFile"], "metadata.json"})
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name in filenames:
            info = zipfile.ZipInfo(f"{data['slug']}/{name}", date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, (folder / name).read_bytes())


def card(font):
    e = lambda value: html.escape(str(value), quote=True)
    slug = font["slug"]
    origin = "Curated reference" if font["origin"] == "reference" else "Community font"
    styles = "1 style" if len(font["files"]) == 1 else f"{len(font['files'])} styles"
    style_options = "".join(f'<option value="{e(a["file"])}" {"selected" if a["file"] == font["preview"] else ""}>{e(a["style"])}</option>' for a in font["files"])
    return f'''<article class="font-card" id="{slug}" data-font="{slug}" data-origin="{font['origin']}" data-category="{font['category']}" data-search="{e(' '.join([font['name'], font['nameMl'], font['author']['name'], font['category']]).casefold())}">
      <div class="card-heading"><div><h2>{e(font['name'])} <span lang="ml">{e(font['nameMl'])}</span></h2><p>By {e(font['author']['name'])}</p></div><span class="category">{e(font['category'].capitalize())}</span></div>
      <div class="specimen-surface"><p class="font-preview" lang="ml" role="region" aria-label="{e(font['name'])} font preview" tabindex="0" data-preview style="font-family: 'font-{slug}', sans-serif">{SAMPLE}</p></div>
      <div class="card-bottom"><span>{origin} <span aria-hidden="true">/</span> {styles}</span><a class="download" href="downloads/{slug}.zip" download>Download ZIP <span aria-hidden="true">↓</span><span class="sr-only"> {e(font['name'])}, font and licence</span></a></div>
      <details><summary>About &amp; licence <span class="details-mark" aria-hidden="true">+</span></summary><div class="font-info"><p>{e(font['description'])}</p>
      <dl><div><dt>Licence</dt><dd><a href="fonts/{slug}/{e(font['licenseFile'])}">{e(font['license'])}</a></dd></div><div><dt>Includes</dt><dd>Font files, complete licence &amp; attribution</dd></div></dl>
      <p><a href="{e(font['source'])}" rel="noopener noreferrer">Original project <span aria-hidden="true">↗</span></a> <a href="fonts/{slug}/{e(font['noticeFile'])}">Attribution &amp; provenance</a></p>
      <label class="style-label" hidden>Preview style <select data-style>{style_options}</select></label></div></details>
    </article>'''


def build(out=ROOT / "dist", fonts=ROOT / "fonts"):
    out = Path(out).resolve()
    # Keep output destruction confined to the documented generated directory.
    if out != ROOT / "dist" or out.is_symlink():
        fail("Build output must be the real repository dist/ directory")
    catalog = validate(fonts)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir()
    for name in ("style.css", "app.js", "favicon.svg"):
        shutil.copyfile(ROOT / "web" / name, out / name)
    (out / "downloads").mkdir()
    (out / "fonts").mkdir()
    rules, public = [], []
    for font in catalog:
        slug = font["slug"]
        shutil.copytree(Path(fonts) / slug, out / "fonts" / slug)
        archive(Path(fonts) / slug, font, out / "downloads" / f"{slug}.zip")
        for asset in font["files"]:
            # All CSS interpolation uses schema-restricted ASCII slugs/file names/numeric weights.
            family = f"font-{slug}" if asset["file"] == font["preview"] else f"font-{slug}-{asset['weight']}"
            rules.append(f"@font-face{{font-family:'{family}';src:url('fonts/{slug}/{asset['file']}');font-weight:{asset['weight']};font-style:normal;font-display:swap;}}")
        public.append(font)
    (out / "fonts.css").write_text("\n".join(rules) + "\n", encoding="utf-8")
    (out / "catalog.json").write_text(json.dumps(public, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    template = (ROOT / "web/index.html").read_text(encoding="utf-8")
    # Origin filters only help when the collection contains both origins.
    origin_filters = ""
    if len({font["origin"] for font in catalog}) > 1:
        origin_filters = '<div class="filter-tabs" role="group" aria-label="Font collection"><button type="button" class="filter active" data-filter="all" aria-pressed="true">All fonts</button><button type="button" class="filter" data-filter="community" aria-pressed="false">Community</button><button type="button" class="filter" data-filter="reference" aria-pressed="false">References</button></div>'
    template = template.replace("<!-- ORIGIN_FILTERS -->", origin_filters)
    # Content-addressed assets prevent stale stylesheet/preview behavior after deployments.
    for name in ("style.css", "app.js", "fonts.css"):
        path = out / name
        digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
        fingerprinted = f"{path.stem}.{digest}{path.suffix}"
        path.rename(out / fingerprinted)
        template = template.replace(f'"{name}"', f'"{fingerprinted}"')
    community_count = sum(f["origin"] == "community" for f in catalog)
    cards = "\n".join(card(f) for f in catalog)
    if not catalog:
        cards = '<p class="empty-catalog">The collection is waiting for its first font. <a href="https://github.com/anima-regem/mashi.guru/blob/main/CONTRIBUTING.md">Publish yours.</a></p>'
    status = ("No community fonts yet. Try these independent reference fonts."
              if not community_count else "Preview and download fonts with their licences.")
    if not catalog:
        status = "No fonts have been published yet. Use the submission guide to contribute the first one."
    template = template.replace("<!-- FONT_CARDS -->", cards).replace("{{FONT_COUNT}}", str(len(catalog))).replace("{{COLLECTION_STATUS}}", status)
    (out / "index.html").write_text(template, encoding="utf-8")
    (out / ".nojekyll").touch()
    return catalog


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("command", choices=["validate", "build"])
    p.add_argument("--fonts", type=Path, default=ROOT / "fonts", help="Font data directory (CI uses submitted data with trusted build code)")
    args = p.parse_args()
    try:
        fonts = build(fonts=args.fonts) if args.command == "build" else validate(args.fonts)
    except (InvalidFont, OSError, ValueError, KeyError) as error:
        print(f"Validation failed: {error}", file=sys.stderr)
        return 1
    print(f"{args.command.capitalize()} OK: {len(fonts)} font families")
    return 0


if __name__ == "__main__":
    sys.exit(main())
