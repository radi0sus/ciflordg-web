# CIFLord Web

Serverless browser application for CIF reporting, average calculations, geometry-parameter analysis, interatomic distance analysis, disorder-model summarisation, and ORTEP-style SVG structure plotting.

## Start

Open `index.html` directly in a browser.

No local mini server is required.

The application runs fully client-side. CIF files are read locally in the browser and are not uploaded anywhere.

**Live demo (GitHub Pages):** https://radi0sus.github.io/ciflordg-web/

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
- Standalone HTML report export with embedded CSS and inline SVG figures
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
- Manual hydrogen-bond annotations in the ORTEP plot based on visible atoms and simple geometric criteria
- Optional use of the current ORTEP plot as an inline figure in the HTML preview and standalone HTML export
- ORTEP export as SVG or PNG
- ORTEP copy as PNG
- Export as standalone HTML, Markdown, plain text, CSV, and RTF
- Copy as formatted preview, Markdown, or plain text

The following features are intentionally not part of this version:

- CIF editing
- CIF rewriting/saving
- Compare tab
- LaTeX export
- PDF export
- DOCX export

LaTeX or PDF output can later be generated from Markdown or the standalone HTML report using external tools or the browser print dialog.

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
- Optional ORTEP figure display in the report preview
- Standalone HTML report export with embedded CSS and inline ORTEP SVG figure where present
- Floating/sticky sidebar and tab navigation
- Report options:
  - show/hide bond lengths
  - show/hide bond angles
  - show/hide calculated geometry parameters
  - show/hide disorder table
  - show/hide hydrogen-bond table
  - show/hide figure caption
  - middle-atom-only angle filtering
  - SI-style unit labels
  - separate or merged display of added distances
- Averages tab with grouped statistics
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
- ORTEP Plot tab:
  - lazy generation when the ORTEP Plot tab is opened
  - bonded-fragment/component selection
  - ORTEP-style SVG displacement ellipsoid plot
  - use of anisotropic displacement parameters where available
  - fallback atom drawing where ADPs are unavailable
  - symmetry-generated atoms from CIF geometry-bond symmetry data
  - interactive mouse rotation
  - double-click view reset
  - probability-level selection
  - fixed or automatic drawing scale
  - separate bond-width and ORTEP-line-width controls
  - label-size controls
  - bond display options including two-colored bonds, bond shadows, and zero bond gap
  - optional hydrogen display
  - optional addition of coordinate hydrogen atoms missing from CIF geometry bonds
  - manual atom and bond visibility overrides
  - manual hydrogen-bond annotations between visible atoms
  - optional use of the current ORTEP plot as a figure in the HTML preview
  - removal of the ORTEP figure from the HTML preview
  - PNG copy to clipboard
  - PNG download
  - SVG download
- Export/download:
  - standalone HTML
  - RTF
  - Markdown
  - plain text
  - CSV
- Clipboard copy:
  - formatted preview without inline ORTEP SVG
  - Markdown
  - plain text
  - ORTEP PNG image

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
- common geometry hydrogen-bond loops where present
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
- `_geom_hbond_atom_site_label_D`
- `_geom_hbond_atom_site_label_H`
- `_geom_hbond_atom_site_label_A`
- `_geom_hbond_distance_DH`
- `_geom_hbond_distance_HA`
- `_geom_hbond_distance_DA`
- `_geom_hbond_angle_DHA`
- `_geom_hbond_site_symmetry_A`
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

Geometry-parameter results can be included in or excluded from the generated report using the global report option. Included geometry-parameter results are added as a separate `Geometry parameters` table in the report preview and in standalone HTML, Markdown, plain text, and RTF exports.

Limitations:

- The calculation depends on the CIF geometry bond table.
- If relevant bonds are missing from the CIF, the coordination sphere may be incomplete.
- Symmetry-generated ligand atoms are handled where symmetry information is provided in the CIF bond table.
- Disorder and alternative positions may require manual ligand selection.
- CShM values are only available for coordination numbers 2–6.
- Geometry parameters are not currently included in the CSV export.

## ORTEP SVG plot

The ORTEP Plot tab generates an ORTEP-style SVG structure plot from the loaded CIF.

The ORTEP model is generated lazily when the ORTEP Plot tab is opened. Loading a CIF file does not automatically create an ORTEP plot while the user is working in other tabs.

The ORTEP Plot tab supports:

- bonded-fragment/component selection
- use of CIF geometry bonds
- use of symmetry information from CIF geometry-bond symmetry fields
- use of anisotropic displacement parameters where available
- fallback atom drawing for atoms without anisotropic displacement parameters
- probability-level selection for displacement ellipsoids
- automatic or fixed drawing scale
- separate control of bond width and ORTEP ellipsoid line width
- label display and label-size controls
- optional carbon and hydrogen labels
- optional hydrogen atom display
- optional addition of coordinate hydrogen atoms missing from CIF geometry bonds
- two-colored bond drawing
- optional bond shadows
- zero bond gap mode for a cleaner direct bond-to-ellipsoid appearance
- manual atom visibility overrides
- manual atom label overrides
- manual bond visibility overrides
- manual hydrogen-bond annotations between visible atoms
- interactive mouse rotation
- double-click view reset
- use of the current ORTEP plot as an inline SVG figure in the HTML preview
- removal of the ORTEP figure from the HTML preview
- PNG copy to clipboard
- PNG download
- SVG download

Hydrogen-bond annotations are added interactively. When a hydrogen atom is selected, the app searches for plausible acceptor atoms among the atoms currently visible in the ORTEP plot using simple geometric criteria. Added hydrogen bonds are drawn as dashed H···A contacts and can be removed again. The feature is intended for selected plot annotations, not for full hydrogen-bond network analysis.

The ORTEP figure can be inserted into the HTML preview by using the ORTEP Plot controls. The inserted figure is a frozen copy of the current ORTEP SVG view. Subsequent rotation or styling changes do not update the preview figure until the user explicitly updates it again.

The ORTEP figure is included in the standalone HTML export as inline SVG when it has been added to the preview. It is not embedded in RTF, Markdown, plain-text, or CSV exports.

Limitations:

- The plot depends on atom coordinates, unit-cell parameters, CIF geometry bonds, symmetry operations, and ADP data present in the CIF.
- If CIF geometry bonds are incomplete, the displayed bonded fragment may be incomplete.
- Extended or polymeric structures may be truncated by the expansion limits.
- The ADP-to-ellipsoid rendering is intended as a practical browser-based visualisation and should be validated against established crystallographic drawing programs for critical publication use.
- Hydrogen-bond annotations use simple geometry-based criteria and only consider atoms currently visible in the ORTEP plot.
- Hydrogen-bond annotations are intended for manual plot annotation, not full packing or hydrogen-bond network analysis.
- PNG export and PNG clipboard copy are generated in the browser from the SVG representation.
- PNG clipboard copy depends on browser support for image clipboard writing and may require a secure browser context.
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

## Hydrogen bonds

A hydrogen-bond table is generated from the CIF hydrogen-bond loop where present, using:

- `_geom_hbond_atom_site_label_D`
- `_geom_hbond_atom_site_label_H`
- `_geom_hbond_atom_site_label_A`
- `_geom_hbond_distance_DH`
- `_geom_hbond_distance_HA`
- `_geom_hbond_distance_DA`
- `_geom_hbond_angle_DHA`
- `_geom_hbond_site_symmetry_A`

The table lists D–H···A distances and angles as provided in the CIF and is not recalculated from atomic coordinates.

Unlike the bond-length and bond-angle tables, the hydrogen-bond table is not affected by the element/atom selection filter, since hydrogen bonds are not tied to a single coordination center. This matches the behaviour of the disorder table.

The hydrogen-bond table can be included in or excluded from the generated report using the global report option.

Limitations:

- The table is only available if a hydrogen-bond loop is present in the CIF.
- Values are taken as provided in the CIF, not recalculated.
- No automatic hydrogen-bond search is performed for the report table (see ORTEP Plot for manual hydrogen-bond annotation in the structure plot).

## Average calculations

The Averages section groups values by element pattern.

Examples:

- bond lengths and distances:
  - `Fe–N`
  - `Fe···O`
- bond angles:
  - `N–Fe–N`
  - `O–Fe–N`

The standard deviation shown in the Averages section describes the scatter of the grouped selected values.

It is not the crystallographic e.s.d. of the mean.

Individual crystallographic e.s.d.s are currently not propagated into the average statistics.

## Export formats

### Standalone HTML

Standalone HTML export writes a complete HTML report containing the current preview content and embedded CSS.

If an ORTEP figure has been added to the preview, it is included in the standalone HTML export as inline SVG.

The standalone HTML export is intended for browser viewing, printing, PDF creation through the browser print dialog, and archival sharing as a single file.

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

Included hydrogen-bond rows are exported as a Markdown table.

ORTEP plots are not included in Markdown export.

### Plain text

Plain text export provides a simple fixed-width readable report.

Included geometry-parameter results are exported as an aligned plain-text table.

Included disorder rows are exported as an aligned plain-text table.

Included hydrogen-bond rows are exported as an aligned plain-text table.

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

Geometry-parameter results, hydrogen-bond table rows, and ORTEP plots are not currently included in the CSV export.

## Notes on copy/paste

Formatted copy uses the browser selection and clipboard mechanism.

This works well in many browsers, but exact formatting can depend on the target application.

Microsoft Word and other word processors may not reproduce the browser preview exactly when using formatted copy, because browser CSS is only partially transferred through the clipboard.

Inline SVG from the ORTEP figure is intentionally omitted from formatted preview copy to avoid SVG text labels being pasted as plain text in word processors. Use ORTEP PNG copy or PNG/SVG download for transferring the plot image.

True RTF clipboard copy is not reliable in browsers, especially when running from `file://`.

Therefore:

- formatted preview copy is supported, but omits the inline ORTEP SVG figure
- Markdown copy is supported
- plain text copy is supported
- ORTEP PNG image copy is supported where the browser allows image clipboard writing
- standalone HTML download is supported and includes the inline ORTEP SVG figure if present
- RTF download is supported
- direct RTF clipboard copy is not provided

For word-processor workflows, use the RTF download where possible. ORTEP plots can be exported or copied separately as PNG, or exported separately as SVG. For a single-file report including the ORTEP SVG figure, use the standalone HTML export.

## Known limitations

- The CIF parser is pragmatic, not a full CIF validator.
- Multiple data blocks are not handled as separate selectable structures.
- Disorder handling is pragmatic and may require manual review.
- Occupancy handling is limited.
- Hydrogen treatment depends on the data present in the CIF.
- The hydrogen-bond table is independent of the element/atom selection filter, matching the disorder table behaviour.
- Geometry-parameter calculations depend on the CIF geometry bond table.
- CShM calculations are available for coordination numbers 2–6.
- Geometry-parameter results are not currently included in CSV export.
- ORTEP plotting depends on CIF geometry bonds and available ADP data.
- ORTEP hydrogen-bond annotations only consider currently visible atoms and are not a packing-network search.
- ORTEP plots can be included as inline SVG in the preview and standalone HTML export, but are not embedded in RTF/Markdown/plain-text/CSV exports.
- ORTEP PNG clipboard copy depends on browser support and security context.
- Manual Disorder Helper edits are not written back to CIF files.
- No CIF editing or rewriting is provided.
- No LaTeX, PDF, DOCX export is provided directly.