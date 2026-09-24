# Examples — claude-code-prompt

## Invoke

```
/claude-code-prompt
Perbaiki loading state di WorkspacePerencana supaya tidak flicker saat SWR revalidate.
```

```
pakai skill claude-code-prompt
Buat prompt Claude Code (Sonnet) untuk: tambah tombol reset kamera di viewer 3D.
```

## Expected agent reply shape

```markdown
## Prompt untuk Claude Code (Sonnet)

Salin semua isi di dalam blok di bawah, lalu paste ke Claude Code.

\`\`\`text
Kamu adalah coding agent di Claude Code. Model target: Sonnet.
...
\`\`\`
```

User selects the entire `text` block content → paste into Claude Code → choose Sonnet.
