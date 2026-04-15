# Dallas-signage-matrix

## Current asset layout

The signage matrix now uses the latest committed JPEG sign files under:

- `data/signs/`

The application data source (`data/signage.json`) points directly to those files by their exact committed filenames.

## Updating signs

When replacing sign art:

1. Add/remove files in `data/signs/` **only**. Do not place sign images at the repo root — the app does not read from there, so a root-level image is a ghost file that will drift from the real one in `data/signs/`.
2. To update an existing sign, overwrite the file in `data/signs/` with the same filename. Because `data/signage.json` references files by exact path, keeping the filename identical means no JSON change is needed.
3. If you must rename a sign, update the matching `image` path in `data/signage.json` so it still points to an existing file.
4. Keep the program PDF (`Final_DAL_2025GolfProgram_26.pdf`) for the Program section.

If a JSON path does not match an existing file, the app will show a fallback preview.

### Avoiding duplicates

The **only** place sign JPEGs/PNGs should live is `data/signs/`. If you find a sign image at the repo root, it is a stray copy from an older workflow — move it into `data/signs/` (overwriting the existing file if the art has been updated) and delete the root copy.

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
