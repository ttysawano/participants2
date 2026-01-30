# participants2 (DokuWiki plugin)

`participants2` is a DokuWiki plugin that lets you place a simple attendance list on a page.
People can click their own name to mark **present/absent** and leave a short comment.
An **Export** button can copy the names for sharing.

## What it does

- Renders a frame-style list of names (no tables)
- Click a name to change attendance and add a one-line comment
- Hover shows the current status (present/absent)
- A comment section lists only the names that have comments
- Export present/absent names with selectable format

## How to use (markup)

```
<participants2>
  <person>John Smith</person>
  <person>Jane Doe</person>
  ...
</participants2>
```

## Install

1. Place this directory under `lib/plugins/participants2/`.
2. Clear the DokuWiki cache (or open a page with `?purge=true`).
3. Use `<participants2>...</participants2>` in a page.

## Localization

Strings are provided in `lang/ja/lang.php` and `lang/en/lang.php`.
You can customize:
- frame title
- click hint
- comment heading
- present/absent labels
- dialog strings
- export UI strings

## Notes

- Data is stored in `data/meta/<page>.participants2.json`.
- The page cache is invalidated when that JSON file is modified.
- Concurrency is the same as DokuWiki metadata-based storage (last save wins).
