# Dallas-signage-matrix

## Merge-conflict fix

`data/signs` is now a directory (with this repo tracking `data/signs/README.md`) rather than a placeholder file.

This prevents a common Git **file-vs-directory** conflict when one branch adds content under `data/signs/...` and another still has `data/signs` as a file.

## Adding new 30x30 and X-banner files

Yes — new sign files will work as long as both of these are done in the same commit:

1. Add the files to the repository (for example at the repo root, or under `assets/`).
2. Add/update matching entries in `data/signage.json` so each item's `image` path exactly matches the committed filename.

### Quick checklist

- Use relative paths in `data/signage.json` (example: `"image": "X_Banner_Welcome_26.pdf"`).
- Keep `.pdf` extension for print-ready files. The app renders PDF previews and opens PDFs in the modal viewer.
- Put 30x30 items under `"30x30 Foam Board (Easel)"`.
- Put welcome signs under `"X-Banners"`.
- Commit and push both the file(s) and JSON update together.

If a file is referenced in JSON but not committed, the preview will fail at runtime.
