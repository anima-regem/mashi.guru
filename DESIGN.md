# Gallery redesign: ink & colour

The visitor is choosing a Malayalam font for a design. The critical path is browse/search → type and compare → inspect licence → download. Contributors have one separate **Publish a font** entry leading to GitHub. This is an explicitly requested visual overhaul of the existing gallery, preserving Mashi / മഷി, its content, URLs, font rights, and contribution pipeline.

The direction is a contemporary type specimen: editable Malayalam is the visual centerpiece, on mint-to-sky ink washes. The heading, controls, canvases and motion share that palette. It is a gallery, not a marketing narrative or an editor.

## Skill used and evidence inspected

Applied the user's [combined Unslop UI Design skill](https://github.com/anima-regem/skills/blob/main/unslop-ui-design/SKILL.md), read on 2026-11-03 (skill blob `e7d82bdfb26d0cc5b37a04c052c620754e5a3272`), including its [audit worksheet](https://github.com/anima-regem/skills/blob/main/unslop-ui-design/references/audit.md), [gallery examples](https://github.com/anima-regem/skills/blob/main/unslop-ui-design/references/examples.md), and [seven-source synthesis notes](https://github.com/anima-regem/skills/blob/main/unslop-ui-design/references/sources.md). The synthesis supplies the design and unslop workflow; upstream sources were not loaded as extra instructions or dependencies.

Inspected the actual live mashi.guru screen and fetched remote main (`89abd411b87ee43c2cfb3ef578c8407f1e4649f5`) before changing code. No project-local `.agents/skills` or applicable AGENTS.md files were found. The original layout worked, but understated specimens and almost absent motion did not meet the new request for a more expressive rebuild.

## Element audit

| Element | Decision | Benefit and treatment |
| --- | --- | --- |
| Mashi identity and navigation | Keep | Retain the Malayalam mark, editor link and a single contribution entry. |
| Collection heading and count | Refine | Larger gradient ink type; the count reflects actual visible fonts, not a promotional metric. |
| Reference notice | Keep | Honest distinction between independent references and community submissions. |
| Shared preview text and size | Keep | Immediate updates; larger 64px default with an editable Malayalam word. Reset restores the HTML default. |
| Search and origin filters | Keep | Malayalam/Latin search, contextual empty state, one-key recovery; origin filters appear only when useful. |
| Real specimens | Rebuild | Solid, contrasting ink on individual gradient canvases. Long previews scroll inside a bounded, keyboard-focusable region. |
| Author, category, style count | Keep | Helps compare designs and preserves attribution. |
| Download | Clarify | Explicit ZIP format; font binaries, full licence, metadata and notices stay intact. |
| Licence and source detail | Keep | Native keyboard disclosure; full terms, original project and provenance stay discoverable. |
| Slogans, fake metrics, setup commands, decorative versions | Omit | They do not assist choosing a font. Developer instructions remain in README/CONTRIBUTING. |

## Visual and motion decisions

Native CSS and the existing locally hosted fonts remain the stack. No new runtime dependencies, remote fonts, images, trackers or services. Light mode uses cool paper; dark mode uses deep blue-green ink. Both retain the same high-contrast pastel specimens. Rounded actions and specimen canvases follow separate, consistent geometry rules.

| Motion | Purpose and limits |
| --- | --- |
| Initial gradient wash | One finite 1.4-second settling movement in the canvas background. Text and controls are visible immediately; no reveal gate. |
| Preview focus / specimen hover | Connects the shared text input with the specimens it changes. Only background transforms; text stays stable. |
| Search result continuity | Native Web Animations moves a matching font from its prior position. No per-keystroke stagger; no movement when position is unchanged. |
| Style change | Brief ink opacity feedback after the selected font actually loads. Stale font-load results cannot replace a newer selection. |
| Disclosure and actions | Plus/cross state, download arrow feedback and input underline. No idle animation or scroll hijacking. |

`prefers-reduced-motion` removes CSS movement and disables Web Animations. A preference change cancels in-flight result transitions. Hidden-page transitions are cancelled. Forced-colour mode replaces gradient text and surfaces with system colours.

## Verification

The existing 21 Python intake/build tests remain applicable. Four Node tests run the actual production enhancement script with DOM fixtures: immediate result movement, no animation under reduced motion, cancellation when the preference changes, and literal input/template-default reset. Run `node --test tests/motion.test.mjs`.

Browser QA covers actual desktop and narrow/mobile rendering, both palettes, Malayalam custom text/search, empty recovery, keyboard sizing/disclosure, bounded long-text overflow and keyboard scrolling. Reduced-motion rendering is checked with a temporary QA fixture forcing the same CSS and JS preference branches; native OS preference emulation is unavailable in the browser tool. The fixture is removed by the final build and is never published.

Measured representative contrast: light secondary text 5.56:1; dark secondary text 8.02:1; control boundaries 3.40:1 light / 5.06:1 dark; conservative specimen backgrounds 9.96:1 mint / 8.30:1 sky. These are specific measured pairs, not a claim of a complete accessibility certification.

The change is on `design/gradient-motion-gallery` for draft review. Pages workflows, schema/intake rules, font files, licences, domain settings and DNS are unchanged. No production deployment is part of this review branch.
