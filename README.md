# participants2 (DokuWiki plugin)

A re-skin of your `participants` plugin that renders a **frame-style,
div-based list** instead of a table:

- Each participant is a small pill inside a flexible row/column layout.
- No individual edit buttons; **click a name** to edit status or leave a one-line comment.
- **Hover** a name to show a small tooltip indicating status (present/absent).
- A **comment section** at the bottom lists only the names with non-empty comments.
- **Export…** button to copy present/absent names in a chosen format.

Data storage and ACL checks are equivalent to the original plugin, but kept separate:
this plugin stores data in `data/meta/<page>.participants2.json`.

## Markup

```
<participants2>
  <person>田中 太郎</person>
  <person>佐藤 花子</person>
  ...
</participants2>
```

## Localization

Strings are provided in `lang/ja/lang.php` and `lang/en/lang.php`.
You can override:
- frame title
- click hint
- comment heading
- present/absent labels
- dialog strings
- export UI strings

## Export

The Export button opens a modal where you can:
- select present and/or absent
- choose full name or first token (split by half/full-width spaces)
- choose delimiter: space, comma, or newline

The output is shown in a textarea and copied to the clipboard.

## Install

1. Put this directory under `lib/plugins/participants2/`.
2. Clear the DokuWiki cache or add `?purge=true` once.
3. Use `<participants2>..</participants2>` in a page.

## Notes

- The page cache is invalidated when `data/meta/<page>.participants2.json` is modified.
- Concurrency behaves the same as DokuWiki metadata-based storage (last save wins).
