# Dallas-signage-matrix

## Current asset layout

The signage matrix now uses the latest committed JPEG sign files under:

- `data/signs/`

The application data source (`data/signage.json`) points directly to those files by their exact committed filenames.

## Updating signs

When replacing sign art:

1. Add/remove files in `data/signs/`.
2. Update `data/signage.json` entries so each item's `image` path matches the filename exactly.
3. Keep the program PDF (`Final_DAL_2025GolfProgram_26.pdf`) for the Program section.

If a JSON path does not match an existing file, the app will show a fallback preview.

## Section-level print-ready downloads

Each category in `data/signage.json` can now include a `printReadyFile` value (SVG, PNG, or PDF path).

Example:

```json
{
  "title": "30x30 Foam Board (Easel)",
  "printReadyFile": "data/print-ready/30x30-foam-board-deck.pdf",
  "items": [ ... ]
}
```

When this field is present, the left navigation shows a **Download print-ready version** button beneath that section's sign list.
If the field is omitted, the button is shown in a disabled state until you add the file path.
