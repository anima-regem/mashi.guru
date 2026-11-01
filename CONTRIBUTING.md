# Publish a Malayalam font

Submissions go to **this website repository**, not the editor or ML repository. You do not need a server, login system, or database. Publication follows a reviewed pull request.

1. Fork [anima-regem/mashi.guru](https://github.com/anima-regem/mashi.guru) and create a branch.
2. Create `fonts/your-font-slug/` using lowercase ASCII words separated by hyphens.
3. Copy [the metadata template](templates/font/metadata.json) into that folder as `metadata.json` and replace every placeholder. Follow [the schema](schema/font.schema.json).
4. Add the original `.ttf` or `.otf` files, complete original licence as a `.txt` file, and a separate `NOTICE.txt` preserving the designer, copyright, reserved font names, attribution, source, pinned revision, file hashes, and any redistribution notices. Include all notices the licence requires.
5. Run the validator and local preview, then open a pull request using the provided template. Include known glyph/shaping limitations. A maintainer reviews the PR; a merge publishes the font automatically.

```text
fonts/your-font-slug/
  metadata.json
  YourFont-Regular.ttf
  OFL.txt
  NOTICE.txt
```

## Metadata

Use `origin: "community"`. `reference` is reserved for maintainer-curated, independent reference fonts. Do not imply that a reference font was created with Mashi or endorsed by its original project.

`name` is the directory display name, `nameMl` its Malayalam name, and `family`, `version`, `style`, and `weight` must match the embedded font metadata exactly. `languages` must include `ml`. `preview` names one of the listed local font files. Multiple styles are supported, with one file entry for each.

Accepted licence identifiers are `OFL-1.1`, `Apache-2.0`, and `CC0-1.0`. Submit only files you have permission to redistribute under those terms. An original licence file and required attribution/notices must accompany every font. For another licence, open a discussion through a PR explaining the terms before adding binaries. Never rename reserved font names casually or strip embedded notices.

`source` points to the original project. `revision` is an immutable, full 40-character Git commit SHA. Each asset `sourceUrl` must be a HTTPS download URL containing that exact revision as a path segment. For a new font, commit the font and licence in your own source repository first, then link to its exact revision here. No credentials, URL shorteners, mutable `main` links, remote font loads, or executable content.

Get a font hash:

```sh
shasum -a 256 fonts/your-font-slug/YourFont-Regular.ttf
```

Inspect embedded metadata after setting up the local environment:

```sh
.venv/bin/python scripts/inspect_font.py fonts/your-font-slug/YourFont-Regular.ttf
```

## Check before opening the PR

```sh
python3 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r requirements.lock
.venv/bin/python scripts/catalog.py validate
.venv/bin/python scripts/catalog.py build
.venv/bin/python -m http.server 8787 --directory dist --bind 127.0.0.1
```

Type Malayalam text including vowel signs, conjuncts, chillus, numbers, and punctuation. Test at a few sizes and on a phone. The basic validator checks file integrity and Unicode coverage; it cannot certify typographic quality or complete shaping. Tell visitors about limitations in the description. Do not describe experimental Mashi exports as complete unless you verified them.

Only declared font and plain text files belong in a submission folder. No nested folders, symlinks, JavaScript, Python, HTML, images, compressed fonts, remote dependencies, or personal handwriting photos/glyph samples. Limits: 3 MiB/file, 8 MiB/family, six styles, ten files total. Do not add generated `dist/` files.

## Maintainer review

Confirm the contributor has redistribution rights. Compare hashes and licence text against the pinned source, keep all notices and original names, inspect actual Malayalam shaping, and ensure the description is accurate. Require human review before merging. Green CI is an integrity check, not an approval. Never enable automatic merge for submissions or run contributor-provided scripts. A data-only PR is checked using the reviewed base branch validator; proposed validator, workflow, or website changes require separate inspection and local checks before merge.

After merge to `main`, the trusted Pages workflow regenerates the collection and downloads. Nothing is published from an unmerged PR.
