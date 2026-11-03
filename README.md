# Mashi / മഷി

A minimal Malayalam font gallery for **mashi.guru**, separate from the [Mashi editor](https://github.com/anima-regem/Mashi) and [Mashi ML](https://github.com/anima-regem/Mashi-ML).

Visitors can type a shared preview, change its size, search by font/designer/category, inspect licences, and download a ZIP containing original fonts, full licence, attribution, and metadata. All processing is local in the browser; there is no account, backend, analytics, tracker, or remote API dependency.

There are **no community-published Mashi fonts yet**. The initial collection contains two clearly labelled, independently created reference fonts: Chilanka Regular and Manjari Regular, by Santhosh Thottingal. Their original files and SIL Open Font License 1.1 notices are preserved. Listing them does not imply endorsement. See [FONT_SOURCES.md](FONT_SOURCES.md).

## Run locally

Requires Python 3.12 or newer. No Node build is needed.

```sh
python3 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r requirements.lock
.venv/bin/python scripts/catalog.py build
.venv/bin/python -m http.server 8787 --directory dist --bind 127.0.0.1
```

Open http://127.0.0.1:8787. Font samples and downloads also work without JavaScript; custom previews and search progressively enhance the page.

```sh
.venv/bin/python scripts/catalog.py validate
.venv/bin/python -m unittest discover -s tests -v
```

## Publish a font

Use the [contribution guide](CONTRIBUTING.md) and [metadata template](templates/font/metadata.json). Fork this website repository, add `fonts/<slug>/` with the required files, validate, and open a pull request. A maintainer reviews rights, coverage, and rendering. After merge to `main`, GitHub Actions rebuilds and deploys the static collection. Submissions are never automatically approved or merged.

## GitHub Pages

Set repository **Settings → Pages → Source → GitHub Actions**. The `Deploy GitHub Pages` workflow builds `dist/` only from the trusted `main` branch and deploys through the `github-pages` environment. The default project URL is `https://anima-regem.github.io/mashi.guru/`. All asset URLs are relative, so the same output supports that project path or an approved root domain.

Custom domain and DNS changes are a separate coordinated step. This repository deliberately contains **no CNAME file and no custom-domain claim**. Once ownership and DNS are confirmed, configure the custom domain through Pages settings. Do not add a custom domain before verifying ownership and avoiding a dangling DNS mapping.

## Intake boundaries

- JSON Schema 2020-12 validation, duplicate-key rejection, plain text metadata and safe HTTPS links.
- Flat ASCII filenames, no symlinks or special files, no undeclared assets, no traversal or submitted code execution.
- Standalone TTF/OTF only: 3 MiB/file, 8 MiB/family, six styles, 64 MiB/collection and 100 families. Larger collections require explicit maintainer review.
- SHA-256 asset integrity, pinned source revision, full font parsing and embedded family/style/version/weight checks, basic Malayalam Unicode coverage.
- Deterministic catalog, page, and ZIP downloads. Every ZIP preserves original font bytes, licence, attribution and metadata.
- An automated licence marker or glyph count is **not** proof of ownership, licence compatibility, correct shaping, or complete language support. Review remains necessary.

Pull-request CI checks out the reviewed base validator and website separately from submitted font data, with a read-only token and no stored Git credentials. It runs no submitted scripts or build hooks. There is no `pull_request_target` workflow, PR deployment, privileged secret, or auto-merge. Code/workflow changes require their own human review; never treat a green font-data check as approval of build-code changes. Maintainers should enable branch protection requiring review and the validation check before accepting community submissions.

Original website code is [MIT licensed](LICENSE). Font licences remain separate and are never replaced by the website licence.

The gallery's interaction and reduced-motion regressions also run without a browser dependency:

```sh
node --test tests/motion.test.mjs
```

See [DESIGN.md](DESIGN.md) for the requested design skill, element audit, motion decisions, and verification scope.
