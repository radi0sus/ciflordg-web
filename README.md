# CIFLord Web

Serverless browser application for CIF preview, average calculations, and interatomic distances.

## Start

Open `index.html` directly in a browser.

No local mini server is required.

## Scope

This web version is intended to provide the useful analysis/reporting parts of the original desktop application:

- CIF loading
- Selection and preview of bond lengths and angles
- Average calculations
- Interatomic distances with estimated e.s.d.
- Export as Markdown, plain text, CSV, and RTF

The following features are intentionally not part of this version:

- CIF editing
- CIF rewriting/saving
- Compare tab
- LaTeX export

LaTeX or PDF output can later be generated from Markdown using tools such as Pandoc.

## Current status

The current version contains:

- UI mockup
- Tabs
- Mock data
- HTML preview
- Average section with clear standard deviation labels
- Added interatomic distances as a separate internal list
- Markdown export
- Plain text export
- CSV export
- RTF download
- Parser stub

## Next steps

1. Extend the CIF parser:
   - CIF data items
   - `loop_` blocks
   - atom sites
   - geometry bond loops
   - geometry angle loops
   - symmetry operations

2. Connect the core extraction logic:
   - extract elements and atoms
   - extract bond lengths from CIF
   - extract bond angles from CIF
   - assign symmetry footnotes

3. Implement interatomic distances:
   - symmetry operation parser without `eval`
   - distance calculation
   - estimated e.s.d. calculation
   - range search
   - optional inclusion in preview and average calculations

## Notes on average calculations

The standard deviation shown in the Average section describes the scatter of the selected values.
It is not the crystallographic e.s.d. of the mean.

A separate e.s.d.-based statistics block may be added later.

## Notes on RTF copy/paste

True RTF copy/paste is not reliable in browsers, especially when running from `file://`.
RTF download is supported instead.