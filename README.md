# Dallas-signage-matrix

## Merge-conflict fix

`data/signs` is now a directory (with this repo tracking `data/signs/README.md`) rather than a placeholder file.

This prevents a common Git **file-vs-directory** conflict when one branch adds content under `data/signs/...` and another still has `data/signs` as a file.
