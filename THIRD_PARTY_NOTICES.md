# Third-party notices

Font assets have separate licences and attribution in their own folders and download ZIPs. See [FONT_SOURCES.md](FONT_SOURCES.md).

## Swanalekha phonetic rule data

- Project: [SMC Swanalekha](https://github.com/smc/swanalekha), by Santhosh Thottingal.
- Revision: [`7463b55a0def8be146e58541840f1e9ad25b0b12`](https://github.com/smc/swanalekha/tree/7463b55a0def8be146e58541840f1e9ad25b0b12), JS package metadata version 1.0.0.
- Licence: MIT. Original full notices are preserved as [LICENSE](vendor/swanalekha/LICENSE) (copyright 2018) and [JS-LICENSE](vendor/swanalekha/JS-LICENSE) (copyright 2021).
- Scope: unmodified `js/src/rules.json`, root licence and JS licence only. No upstream DOM adapter, dependencies or build tooling is bundled or executed.

| Local file | Upstream path | SHA-256 |
| --- | --- | --- |
| `rules.json` | `js/src/rules.json` | `231d7c46ebfdf214330132e373ed842d9708078d59677a91318efec03d673615` |
| `LICENSE` | `LICENSE` | `d8e6924435b091cc0d49bdc1bea5604a48d0150f067338a2192662de2ece837c` |
| `JS-LICENSE` | `js/LICENSE` | `3a1e2e86991b6cf8af33ae2a696ca0ce77fb8ec8c24babf9c74e01fe8802ff5c` |

[Machine-readable provenance](vendor/swanalekha/provenance.json) is checked during every build. Both full notices are embedded in the generated JavaScript and copied to `notices/swanalekha/` with provenance. The engine and input adapter are original Mashi website code under this repository's MIT licence. Listing or using these rules does not imply endorsement by SMC or the upstream author.
