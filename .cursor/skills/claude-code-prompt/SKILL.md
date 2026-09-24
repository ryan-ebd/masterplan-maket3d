---
name: claude-code-prompt
description: >-
  Builds a self-contained, copy-ready prompt for Claude Code (Sonnet).
  Use only when the user explicitly invokes this skill by name
  (e.g. /claude-code-prompt, "pakai claude-code-prompt", "buat prompt claude code").
  Do not auto-invoke from ambient coding context.
disable-model-invocation: true
---

# Claude Code Prompt Builder

Produce **one** paste-ready prompt for **Claude Code** targeting **Sonnet** (`claude-sonnet-4-5` / model alias `sonnet`). The user will copy it into Claude Code — nothing else is required from this skill.

## When invoked

1. Read the user's request in this turn (and short prior context if they refer to "ini" / "task tadi").
2. Gather only the facts needed for Claude Code to work alone:
   - goal and non-goals
   - relevant files / dirs (absolute or repo-relative paths)
   - constraints from the repo (stack, patterns, "don't touch X")
   - acceptance criteria / how to verify
3. Optionally skim 1–3 key files for accurate paths and APIs — do not dump large code into the prompt; cite paths and short snippets only when essential.
4. Emit the prompt using the **Output contract** below. Stop after that.

## Output contract (mandatory)

Reply with **exactly** this shape — no preamble, no summary after the fence:

```markdown
## Prompt untuk Claude Code (Sonnet)

Salin semua isi di dalam blok di bawah, lalu paste ke Claude Code.

\`\`\`text
<PROMPT>
\`\`\`
```

Rules for `<PROMPT>`:

- Self-contained: Claude Code has **no** Cursor chat history.
- Indonesian or English matching the user's request language.
- Imperative, concrete, scoped (files + done definition).
- No Cursor-only tooling mentions (no Canvas, no Cursor skills).
- Prefer: read → change → verify (`npm run lint` / targeted checks when known).
- If the task is ambiguous, state **assumptions** inside the prompt, not as questions outside it.
- Keep under ~800 words unless the user asked for a deep dump.

## Prompt template (fill all sections)

Use this structure inside the `text` fence:

```text
Kamu adalah coding agent di Claude Code. Model target: Sonnet.

## Tujuan
<1–3 kalimat: apa yang harus selesai>

## Konteks proyek
- Repo: masterplan-maket3d
- Stack: Next.js 15, React 19, Prisma, Three.js / R3F, Tailwind (sesuaikan jika relevan)
- Working directory: root repo

## Scope
Kerjakan HANYA:
- <file/dir 1>
- <file/dir 2>
Jangan ubah:
- <yang tidak boleh disentuh, atau "di luar scope di atas">

## Yang sudah diketahui
- <fakta dari chat Cursor / file yang dibaca>
- <bug/gejala / requirement>

## Instruksi kerja
1. <langkah>
2. <langkah>
3. <langkah>

## Constraint
- Ikuti pola kode yang sudah ada di folder terkait
- Jangan refactor di luar kebutuhan task
- Jangan commit / push kecuali diminta di prompt ini
- <constraint lain dari user>

## Definition of done
- [ ] <kriteria 1>
- [ ] <kriteria 2>
- [ ] Verifikasi: <perintah atau cek manual>

## Output yang diharapkan dari kamu
Ringkas: file yang diubah + perilaku baru. Jika blocked, tulis blocker + opsi berikutnya.
```

## Variants

If the user specifies a mode, adjust the prompt:

| User cue | Adapt prompt |
|----------|----------------|
| `bugfix` / `perbaiki` | Add repro steps, expected vs actual, likely root cause |
| `fitur` / `implement` | Add UX/API acceptance + edge cases |
| `review` | Ask Claude Code for findings only; no edits unless asked |
| `refactor` | Tight scope + "behavior must stay identical" |
| `dengan model X` | Replace Sonnet line with the named model |

If the user pastes extra requirements, merge them into the matching sections — do not invent a second prompt.

## Anti-patterns

- Do not auto-run this skill without an explicit invoke.
- Do not wrap the copyable prompt in multiple nested fences that break paste.
- Do not leave TODOs like "isi sendiri" — fill from context or state assumptions.
- Do not implement the task in Cursor when this skill was invoked only to generate the handoff prompt (unless the user also asked to implement).
