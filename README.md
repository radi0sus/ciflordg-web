# CIFLord Web

Serverless browser application for CIF preview, crystallographic report generation, average calculations, geometry-parameter analysis, and interatomic distance analysis.

## Start

Open `index.html` directly in a browser.

No local mini server is required.

The application runs fully client-side. CIF files are read locally in the browser and are not uploaded anywhere.

## Scope

This web version provides the useful analysis and reporting parts of the original desktop application:

- CIF loading by file picker or drag and drop
- CIF parsing of data items and `loop_` blocks
- Extraction of atom sites
- Extraction of symmetry operations
- Extraction of bond lengths from CIF geometry loops
- Extraction of bond angles from CIF geometry loops
- Selection and filtering by element or atom
- Optional filtering of independent entries only
- Optional filtering of bond angles by middle atom only
- HTML preview of crystallographic report data
- Average calculations for bond lengths, interatomic distances, and bond angles
- Geometry-parameter calculations from CIF geometry bonds
- Continuous Shape Measures (CShM) for coordination numbers 2–6
- Coordination descriptors such as τ₄, τ₄′, τ₅, and coordination polyhedron volume
- Interatomic distance calculation with estimated e.s.d.
- Interatomic distance range search
- Optional inclusion of added interatomic distances in preview, export, and average calculations
- Optional inclusion of calculated geometry parameters in the generated report
- Export as Markdown, plain text, CSV, and RTF
- Copy as formatted preview, Markdown, or plain text

The following features are intentionally not part of this version:

- CIF editing
- CIF rewriting/saving
- Compare tab
- LaTeX export
- PDF export
- ORTEP/structure plot

LaTeX or PDF output can later be generated from Markdown using tools such as Pandoc.

## Current status

The current version contains a working browser-only implementation with:

- Responsive web UI
- Light/dark mode support via system preference
- File loading by button or drag and drop
- CIF parser for basic data items and loops
- Atom site extraction
- Unit-cell extraction
- Symmetry operation extraction
- Bond length extraction
- Bond angle extraction
- Symmetry footnotes for generated atoms
- Selection tab with filtered bond lengths, bond angles, and added distances
- Preview panel for the generated report
- Report options:
  - show/hide bond lengths
  - show/hide bond angles
  - middle-atom-only angle filtering
  - show/hide figure caption
  - SI-style unit labels
  - separate or merged display of added distances
- Average tab with grouped statistics
- Geometry Parameters tab:
  - element and atom selection
  - ligand atoms taken from the CIF geometry bond table
  - manual ligand inclusion/exclusion
  - CShM comparison for coordination numbers 2–6
  - τ₄, τ₄′, τ₅, and coordination polyhedron volume
  - stored calculated geometry-parameter results
  - optional inclusion of geometry-parameter results in the generated report
- Interatomic distances tab:
  - single distance calculation
  - symmetry operation and translation code selection
  - estimated e.s.d. calculation
  - distance range search
  - management of added distances
- Export/download:
  - RTF
  - Markdown
  - plain text
  - CSV
- Clipboard copy:
  - formatted preview
  - Markdown
  - plain text

## CIF parser support

The parser currently supports the CIF features needed for the reporting workflow:

- `data_` blocks
- simple data items
- quoted values
- semicolon-delimited multiline values
- inline comments outside quoted strings
- `loop_` blocks
- common atom-site loops
- common geometry bond loops
- common geometry angle loops
- common symmetry operation loops

The parser is intentionally lightweight and is not a complete formal CIF validator.

## Supported CIF data

The application uses, where available, data such as:

- `_chemical_formula_sum`
- `_chemical_formula_moiety`
- `_chemical_formula_weight`
- `_diffrn_ambient_temperature`
- `_cell_length_a`
- `_cell_length_b`
- `_cell_length_c`
- `_cell_angle_alpha`
- `_cell_angle_beta`
- `_cell_angle_gamma`
- `_cell_volume`
- `_space_group_name_H-M_alt`
- `_space_group_IT_number`
- `_atom_site_label`
- `_atom_site_type_symbol`
- `_atom_site_fract_x`
- `_atom_site_fract_y`
- `_atom_site_fract_z`
- `_geom_bond_atom_site_label_1`
- `_geom_bond_atom_site_label_2`
- `_geom_bond_distance`
- `_geom_bond_site_symmetry_1`
- `_geom_bond_site_symmetry_2`
- `_geom_angle_atom_site_label_1`
- `_geom_angle_atom_site_label_2`
- `_geom_angle_atom_site_label_3`
- `_geom_angle`
- `_geom_angle_site_symmetry_1`
- `_geom_angle_site_symmetry_2`
- `_geom_angle_site_symmetry_3`
- `_space_group_symop_operation_xyz`
- `_symmetry_equiv_pos_as_xyz`

Some common alternative tag names are also supported.

## Geometry parameters and CShM

The Geometry Parameters tab calculates coordination geometry descriptors for a selected atom.

Ligand atoms are taken from the CIF geometry bond table rather than from automatic radius-based neighbour searching. This keeps the calculation consistent with the bond information provided by the CIF.

The user can manually include or exclude ligand atoms before calculating the geometry parameters. This is useful for structures with disorder, alternative positions, or contacts that should not be part of the coordination sphere.

The tab can calculate:

- Continuous Shape Measures (CShM) for coordination numbers 2–6
- τ₄ for four-coordinate centers
- τ₄′ for four-coordinate centers
- τ₅ for five-coordinate centers
- coordination polyhedron volume `V`

The octahedricity parameter `O` is intentionally not included.

Calculated geometry-parameter results are stored in the tab until they are removed or the CIF is reloaded.

Each calculated result can be included in or excluded from the generated report. Included geometry-parameter results are added as a separate `Geometry parameters` table in the report preview and in Markdown, plain text, and RTF exports.

Limitations:

- The calculation depends on the CIF geometry bond table.
- If relevant bonds are missing from the CIF, the coordination sphere may be incomplete.
- Symmetry-generated ligand atoms are handled where symmetry information is provided in the CIF bond table.
- Disorder and alternative positions may require manual ligand selection.
- CShM values are only available for coordination numbers 2–6.
- Geometry parameters are not currently included in the CSV export.

## Interatomic distances

The Interatomic Distances tab can calculate additional distances from atom coordinates, unit-cell parameters, symmetry operations, and translation codes.

The e.s.d. for calculated distances is estimated from coordinate and unit-cell e.s.d.s.

Limitations:

- Correlations are not considered.
- The calculation is intended as a practical estimate.
- The result depends on the availability and quality of coordinate and unit-cell e.s.d.s in the CIF.

Added distances can be included or excluded from:

- preview
- exports
- average calculations

They can either be shown in a separate section or merged into the bond-length table.

## Average calculations

The Average section groups values by element pattern.

Examples:

- bond lengths and distances:
  - `Fe–N`
  - `Fe···O`
- bond angles:
  - `N–Fe–N`
  - `O–Fe–N`

The standard deviation shown in the Average section describes the scatter of the grouped selected values.

It is not the crystallographic e.s.d. of the mean.

Individual crystallographic e.s.d.s are currently not propagated into the average statistics.

## Export formats

### RTF

RTF export is intended for word processors such as Microsoft Word or LibreOffice Writer.

It preserves basic formatting such as:

- bold captions
- italics
- superscripts
- subscripts
- tables
- symmetry notes
- geometry-parameter tables

### Markdown

Markdown export is intended for readable text-based reports and further conversion using tools such as Pandoc.

Included geometry-parameter results are exported as a Markdown table.

### Plain text

Plain text export provides a simple fixed-width readable report.

Included geometry-parameter results are exported as an aligned plain-text table.

### CSV

CSV export is intended for reuse in spreadsheet or data-processing software.

The CSV contains selected/exported numerical geometry data from bond lengths, angles, and added interatomic distances.

The current CSV format uses:

- `type`
- `atoms`
- `cif-value`
- `source`
- `value`

where:

- `cif-value` is the original value including crystallographic e.s.d. notation, for example `1.844(10)`
- `value` is the numerical value only, for example `1.844`

Typographic dashes are converted to ASCII hyphens in the CSV output.

Geometry-parameter results are not currently included in the CSV export.

## Notes on copy/paste

Formatted copy uses the browser selection and clipboard mechanism.

This works well in many browsers, but exact formatting can depend on the target application.

True RTF clipboard copy is not reliable in browsers, especially when running from `file://`.

Therefore:

- formatted preview copy is supported
- Markdown copy is supported
- plain text copy is supported
- RTF download is supported
- direct RTF clipboard copy is not provided

## Known limitations

- The CIF parser is pragmatic, not a full CIF validator.
- Multiple data blocks are not handled as separate selectable structures.
- Disorder handling is limited.
- Occupancy handling is limited.
- Hydrogen treatment depends on the data present in the CIF.
- Geometry-parameter calculations depend on the CIF geometry bond table.
- CShM calculations are available for coordination numbers 2–6.
- Geometry-parameter results are not currently included in CSV export.
- No structure drawing or ORTEP plot is currently included.
- No CIF editing or rewriting is provided.
- No LaTeX or PDF export is provided directly.

