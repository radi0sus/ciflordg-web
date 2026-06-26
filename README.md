# CIFLord Web

Serverless browser application for CIF preview, crystallographic report generation, average calculations, geometry-parameter analysis, interatomic distance analysis, disorder-model summarisation, and ORTEP-style SVG structure plotting.

## Start

Open `index.html` directly in a browser.

No local mini server is required.

The application runs fully client-side. CIF files are read locally in the browser and are not uploaded anywhere.

## Scope

This web version provides the useful analysis, reporting, and visualisation parts of the original desktop application:

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
- Management of added interatomic distances
- Optional inclusion of calculated geometry parameters in the generated report
- Disorder Helper for summarising crystallographic disorder information
- Editable moiety and comment fields for disorder groups
- Optional inclusion of the disorder table in the generated report
- ORTEP-style SVG structure plotting from CIF atom, bond, symmetry, and ADP data
- Interactive ORTEP view rotation and manual atom/bond display overrides
- ORTEP export as SVG or PNG
- Export as Markdown, plain text, CSV, and RTF
- Copy as formatted preview, Markdown, or plain text

The following features are intentionally not part of this version:

- CIF editing
- CIF rewriting/saving
- Compare tab
- LaTeX export
- PDF export
- DOCX export

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
- Floating/sticky sidebar and tab navigation
- Report options:
  - show/hide bond lengths
  - show/hide bond angles
  - show/hide calculated geometry parameters
  - show/hide disorder table
  - show/hide figure caption
  - middle-atom-only angle filtering
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
- Interatomic Distances tab:
  - single distance calculation
  - symmetry operation and translation code selection
  - estimated e.s.d. calculation
  - distance range search
  - management of added distances
- Disorder Helper tab:
  - extraction of disorder groups from atom-site disorder fields
  - extraction of restraints and constraints from embedded SHELXL RES data where available
  - compact or verbose atom-list display
  - optional exclusion of hydrogen atoms
  - editable moiety field with suggestion list
  - editable comment field with automatic comment suggestions
  - optional inclusion of the disorder table in the generated report
- ORTEP tab:
  - lazy generation when the ORTEP tab is opened
  - bonded-fragment/component selection
  - ORTEP-style SVG displacement ellipsoid plot
  - use of anisotropic displacement parameters where available
  - fallback atom drawing where ADPs are unavailable
  - symmetry-generated atoms from CIF geometry-bond symmetry data
  - interactive mouse rotation
  - double-click view reset
  - probability-level selection
  - drawing/style scale controls
  - label controls
  - optional hydrogen display
  - optional addition of coordinate hydrogen atoms missing from CIF geometry bonds
  - manual atom and bond visibility overrides
  - SVG download
  - PNG download
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

The parser currently supports the CIF features needed for the reporting and ORTEP workflows:

- `data_` blocks
- simple data items
- quoted values
- semicolon-delimited multiline values
- inline comments outside quoted strings
- `loop_` blocks
- common atom-site loops
- common atom-site anisotropic displacement parameter loops
- common geometry bond loops
- common geometry angle loops
- common symmetry operation loops
- embedded multiline values such as `_shelx_res_file`

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
- `_atom_site_U_iso_or_equiv`
- `_atom_site_adp_type`
- `_atom_site_occupancy`
- `_atom_site_disorder_assembly`
- `_atom_site_disorder_group`
- `_atom_site_aniso_label`
- `_atom_site_aniso_U_11`
- `_atom_site_aniso_U_22`
- `_atom_site_aniso_U_33`
- `_atom_site_aniso_U_12`
- `_atom_site_aniso_U_13`
- `_atom_site_aniso_U_23`
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
- `_shelx_res_file`

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

Geometry-parameter results can be included in or excluded from the generated report using the global report option. Included geometry-parameter results are added as a separate `Geometry parameters` table in the report preview and in Markdown, plain text, and RTF exports.

Limitations:

- The calculation depends on the CIF geometry bond table.
- If relevant bonds are missing from the CIF, the coordination sphere may be incomplete.
- Symmetry-generated ligand atoms are handled where symmetry information is provided in the CIF bond table.
- Disorder and alternative positions may require manual ligand selection.
- CShM values are only available for coordination numbers 2–6.
- Geometry parameters are not currently included in the CSV export.

## ORTEP SVG plot

The ORTEP tab generates an ORTEP-style SVG structure plot from the loaded CIF.

The ORTEP model is generated lazily when the ORTEP tab is opened. Loading a CIF file does not automatically create an ORTEP plot while the user is working in other tabs.

The ORTEP tab supports:

- bonded-fragment/component selection
- use of CIF geometry bonds
- use of symmetry information from CIF geometry-bond symmetry fields
- use of anisotropic displacement parameters where available
- fallback atom drawing for atoms without anisotropic displacement parameters
- probability-level selection for displacement ellipsoids
- interactive mouse rotation
- double-click view reset
- label display controls
- optional carbon and hydrogen labels
- optional hydrogen atom display
- optional addition of coordinate hydrogen atoms missing from CIF geometry bonds
- manual atom visibility overrides
- manual atom label overrides
- manual bond visibility overrides
- SVG download
- PNG download

The ORTEP plot is independent of the generated crystallographic report. It is not included in the report preview, Markdown export, plain-text export, CSV export, or RTF export.

Limitations:

- The plot depends on atom coordinates, unit-cell parameters, CIF geometry bonds, symmetry operations, and ADP data present in the CIF.
- If CIF geometry bonds are incomplete, the displayed bonded fragment may be incomplete.
- Extended or polymeric structures may be truncated by the expansion limits.
- The ADP-to-ellipsoid rendering is intended as a practical browser-based visualisation and should be validated against established crystallographic drawing programs for critical publication use.
- PNG export is generated in the browser from the SVG representation.
- ORTEP plots are not written back to CIF files.

## Interatomic distances

The Interatomic Distances tab can calculate additional distances from atom coordinates, unit-cell parameters, symmetry operations, and translation codes.

The e.s.d. for calculated distances is estimated from coordinate and unit-cell e.s.d.s.

Limitations:

- Correlations are not considered.
- The calculation is intended as a practical estimate.
- The result depends on the availability and quality of coordinate and unit-cell e.s.d.s in the CIF.

Added distances are managed in the Interatomic Distances tab.

Added distances are included in:

- preview
- exports
- average calculations

To exclude an added distance, remove it from the added-distance table.

Added distances can either be shown in a separate section or merged into the bond-length table.

## Disorder Helper

The Disorder Helper tab summarises disorder information from the CIF.

It uses atom-site disorder fields where available:

- `_atom_site_disorder_assembly`
- `_atom_site_disorder_group`
- `_atom_site_occupancy`
- `_atom_site_label`
- `_atom_site_adp_type`

If an embedded SHELXL RES file is available through `_shelx_res_file`, the Disorder Helper also scans it for common restraints, constraints, and SAME instructions.

Currently recognised restraint/constraint instructions include:

- restraints:
  - `SAME`
  - `SADI`
  - `RIGU`
  - `SIMU`
  - `DELU`
  - `ISOR`
  - `DFIX`
- constraints:
  - `EADP`

The generated disorder table contains:

- Assembly
- Part
- Occupancy
- Atoms
- Moiety
- Restraints
- Constraints
- Comment

The `Moiety` field is editable and supports free text with suggestions from a built-in moiety library. The library includes common solvents, ions, and organic fragments using Unicode subscripts and superscript charges, for example `PF₆⁻`, `BF₄⁻`, `CH₂Cl₂`, and `H₂O`.

The `Comment` field is editable. Some comments are generated automatically where applicable, for example:

- disorder about a symmetry operation
- isotropic refinement
- partially isotropic refinement
- moiety-based comments from the suggestion library

Options:

- exclude hydrogen atoms
- compact or verbose atom-list display
- regenerate from CIF
- clear manual edits

The disorder table can be included in or excluded from the generated report using the global report option.

Limitations:

- Disorder detection depends on the disorder fields present in the CIF.
- The SHELXL RES parser is pragmatic and searches common commands rather than fully parsing SHELXL syntax.
- SAME association is assigned to the first following disordered atom line in the embedded RES file.
- Complex or unusual disorder models may require manual editing of the generated table.
- Manual edits are held in browser memory and are reset when a new CIF is loaded.

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
- disorder tables

ORTEP plots are not included in RTF export.

### Markdown

Markdown export is intended for readable text-based reports and further conversion using tools such as Pandoc.

Included geometry-parameter results are exported as a Markdown table.

Included disorder rows are exported as a Markdown table.

ORTEP plots are not included in Markdown export.

### Plain text

Plain text export provides a simple fixed-width readable report.

Included geometry-parameter results are exported as an aligned plain-text table.

Included disorder rows are exported as an aligned plain-text table.

ORTEP plots are not included in plain-text export.

### CSV

CSV export is intended for reuse in spreadsheet or data-processing software.

The CSV contains selected/exported numerical geometry data from bond lengths, angles, and added interatomic distances, as well as exported disorder-table rows.

The current CSV format uses:

- `type`
- `atoms`
- `cif-value`
- `source`
- `value`
- `assembly`
- `part`
- `occupancy`
- `moiety`
- `restraints`
- `constraints`
- `comment`

For bond lengths, angles, and added interatomic distances:

- `cif-value` is the original value including crystallographic e.s.d. notation, for example `1.844(10)`
- `value` is the numerical value only, for example `1.844`

For disorder rows:

- `type` is `disorder`
- `source` is `disorder-helper`
- disorder-specific columns are filled where available

Typographic dashes are converted to ASCII hyphens in the CSV output.

Geometry-parameter results and ORTEP plots are not currently included in the CSV export.

## Notes on copy/paste

Formatted copy uses the browser selection and clipboard mechanism.

This works well in many browsers, but exact formatting can depend on the target application.

Microsoft Word and other word processors may not reproduce the browser preview exactly when using formatted copy, because browser CSS is only partially transferred through the clipboard.

True RTF clipboard copy is not reliable in browsers, especially when running from `file://`.

Therefore:

- formatted preview copy is supported
- Markdown copy is supported
- plain text copy is supported
- RTF download is supported
- direct RTF clipboard copy is not provided

For word-processor workflows, use the RTF download where possible.

## Known limitations

- The CIF parser is pragmatic, not a full CIF validator.
- Multiple data blocks are not handled as separate selectable structures.
- Disorder handling is pragmatic and may require manual review.
- Occupancy handling is limited.
- Hydrogen treatment depends on the data present in the CIF.
- Geometry-parameter calculations depend on the CIF geometry bond table.
- CShM calculations are available for coordination numbers 2–6.
- Geometry-parameter results are not currently included in CSV export.
- ORTEP plotting depends on CIF geometry bonds and available ADP data.
- ORTEP plots are exported separately as SVG or PNG and are not part of the generated text/RTF/Markdown/CSV report exports.
- Manual Disorder Helper edits are not written back to CIF files.
- No CIF editing or rewriting is provided.
- No LaTeX, PDF, DOCX export is provided directly.