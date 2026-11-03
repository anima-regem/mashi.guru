# Gallery usefulness review

Applied the user's [Unslop UI Design skill](https://github.com/anima-regem/skills/blob/main/unslop-ui-design/SKILL.md), skill blob `96977cad4af289e78710a69b77bba15cf5ca7f32`, with its [audit worksheet](https://github.com/anima-regem/skills/blob/main/unslop-ui-design/references/audit.md) and [gallery examples](https://github.com/anima-regem/skills/blob/main/unslop-ui-design/references/examples.md).

## Brief and direction

A visitor choosing a Malayalam font needs to browse/search → type and compare → inspect rights → download. A contributor needs one clear submission entry. This is a narrow extension of the existing specimen gallery, preserving the ink palette, gradient canvases, typography, motion and Malayalam support. It is not another visual rebuild.

Durable user preference: every visible element must help use the product; remove implementation narration, developer commands, decorative versions, slogans and obvious state badges. The user specifically rejected “English stays in the field; the font previews show Malayalam.” That line is removed, without a replacement explanation on the main surface. Detailed input behavior already belongs in `docs/MANGLISH.md`.

The review starts from main `313ac358fc92cd014079104667cbdaf49b7f90ca`, where Manglish PR #2 is already merged and deployed. No merge of that PR is repeated. No applicable repository AGENTS.md or local skills were present in the fresh checkout.

## Element inventory

| Surface / state | Element | Decision | User benefit / concrete change |
| --- | --- | --- | --- |
| Header | Malayalam mark and Mashi home link | Keep | Identity and a home route without a slogan. |
| Header | Editor link | Remove duplicate | The same editor route remains in the footer on all viewport sizes. |
| Header | Publish a font | Keep | One clear contribution entry; GitHub setup remains in the linked contribution guide. |
| Collection | Malayalam fonts heading and live count | Keep | Orientation and actual filtered result count. |
| Collection | Reference collection introduction | Simplify | “No community fonts yet.” conveys the necessary current state; remove the invitation that narrates trying the specimens. |
| Preview | Preview text label and Malayalam placeholder | Keep | Identifies the editable shared specimen input. |
| Preview | Manglish checkbox | Keep | Explicit opt-in phonetic input mode, off by default. |
| Preview | English-field/Malayalam-preview sentence | Remove | Narrates implementation already demonstrated by the input and specimens; explicitly rejected by the user. |
| Preview | Reset | Simplify | Familiar reset icon with “Reset preview” tooltip and accessible name; same text/size reset behavior and 44px target. |
| Preview | Size label, value and slider | Keep | Controls the comparison size and exposes its real value. |
| Manglish / options available | Labelled letter menu | Keep | Resolves genuine rule ambiguity at the source caret without intercepting Tab. |
| Manglish / help collapsed | Typing help disclosure | Keep | Optional, discoverable guidance for unfamiliar phonetic conventions. |
| Manglish / help expanded | Example and case/prediction limits | Simplify | Keep one real example and concise limitations that affect spelling and expectations. |
| Manglish / help expanded | Literal English, URL and email guidance | Keep | Helps compose mixed-script samples without unexpected conversion. |
| Manglish / help expanded | Menu and normal-Tab narration | Remove | The labelled native menu and normal keyboard behavior already express this. |
| Manglish / help expanded | Official guide and rule licence/credit links | Keep | Full conventions and required source attribution remain discoverable. |
| Manglish / error | Unavailable message and reload/direct-input recovery | Keep | Actionable only on failure; source typing remains usable. |
| Search | Accessible search label and concise placeholder | Keep | Discovery by font, author or category without a redundant visible label. |
| Mixed collections | Origin filters | Keep conditionally | Only generated when both reference and community content exist. |
| Font cards | Latin/Malayalam names, author and category | Keep | Comparison, identity, script support and attribution. |
| Font cards | Live specimens | Keep | The fonts themselves are the visual centerpiece and actual typed preview. |
| Font cards | Reference provenance and real style count | Keep | Distinguishes independent reference fonts from community submissions and describes the download. |
| Font cards | ZIP download | Keep | Explicit format and primary visitor action; original fonts and complete notices preserved. |
| Font details | About & licence disclosure | Keep | Secondary details remain adjacent to selection/download. |
| Font details | Description, licence and ZIP contents | Keep | Helps assess style and usage rights; full licence stays linked. |
| Font details | Original project and attribution/provenance | Keep | Author/source evidence and full notices. |
| Multiple styles | Preview style menu | Keep conditionally | Hidden when there is only one choice; useful comparison otherwise. |
| Font loading / error | Preview failure and available download recovery | Keep | Explains the affected operation without losing the download path. |
| Empty search | Query-specific result and Show all fonts | Keep | Understandable state and one-action recovery. |
| Empty catalog | Honest empty state and contribution link | Keep | No fabricated submissions or downloads. |
| Assistive technology | Skip link, names, focus and live result status | Keep | Keyboard and screen-reader access; visible count alone is insufficient. |
| No JavaScript | Enhancement explanation | Keep | Relevant only when custom preview/search cannot run; states working alternatives. |
| Footer | Brand and source/editor/ML links | Keep | Identity and distinct project routes, including the editor route removed from the header. |
| Footer | “Fonts carry their own licences.” | Remove duplicate | Actual terms, attribution, source notices and ZIP licences remain on every font. |
| All normal states | Setup commands, versions, local/experimental badges and slogans | None present | Keep developer setup and implementation descriptions in GitHub docs. |

No font files, copyright notices, legal texts, input engine, event adapter, search logic, workflow, domain configuration or DNS are changed. Gradients, finite motion and reduced-motion behavior remain intact.

## Verification boundaries

The existing 28 Node and 25 Python tests pass, as do the deterministic build and diff whitespace check. No new tests were added solely to mirror copy. Browser checks exercised default direct input, Manglish conversion/alternatives, expanded typing help, keyboard reset of text and size, empty-search recovery, and full font licence/provenance disclosure. Direct Malayalam remained intact with Manglish off. The removed sentence was absent from rendered text. The reset button exposes its name and tooltip and measures 44 × 44px. The 390px mobile page measures 390px wide, with no page overflow. Desktop and mobile screenshots are saved in ignored `output/`; no console errors or warnings were observed, and the temporary viewport override was reset.

Empty catalogs, mixed-origin filters, multiple styles, loading errors and no-JavaScript recovery were reviewed in source; they were not all induced as rendered fixtures during this narrow correction. Existing reduced-motion regression tests pass, and the motion/color rules are unchanged. OS IME composition is still simulation-tested only; this copy review does not establish hardware-keyboard or additional-engine compatibility or a complete accessibility certification.
