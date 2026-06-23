(function () {
  "use strict";

  window.CIFLord = window.CIFLord || {};

  var RESTR = ["SADI", "RIGU", "SIMU", "DELU", "ISOR", "DFIX"];
  var CONSTR = ["EADP"];
  var SPECIAL = ["SAME"];

  function $(id) {
    return document.getElementById(id);
  }

  function setHTML(id, html) {
    var el = $(id);
    if (el) el.innerHTML = html;
  }

  function setText(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeMissing(value) {
    if (value === undefined || value === null) {
      return "";
    }

    value = String(value).trim();

    if (value === "." || value === "?") {
      return "";
    }

    return value;
  }

  function commandOfLine(line) {
    var parts = String(line || "").trim().split(/\s+/);
    return (parts[0] || "").toUpperCase();
  }

  function headerIndex(loop, candidates) {
    if (!loop || !loop.headers) {
      return -1;
    }

    for (var i = 0; i < candidates.length; i++) {
      var idx = loop.headers.indexOf(candidates[i]);

      if (idx !== -1) {
        return idx;
      }
    }

    return -1;
  }

  function rowValue(loop, row, candidates) {
    var idx = headerIndex(loop, candidates);

    if (idx === -1) {
      return "";
    }

    return normalizeMissing(row[idx]);
  }

  function elementFromAtomLabel(label) {
    var m = String(label || "").match(/^([A-Z][a-z]?)/);
    return m ? m[1] : "";
  }

  function normalizeElement(el) {
    el = String(el || "").replace(/[^A-Za-z]/g, "");

    if (!el) {
      return "";
    }

    if (el.length === 1) {
      return el.toUpperCase();
    }

    return el.charAt(0).toUpperCase() + el.charAt(1).toLowerCase();
  }

  function isHydrogenAtom(atom) {
    return normalizeElement(atom.element) === "H";
  }

  function splitResLines(resFileText) {
    return String(resFileText || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(function (line) {
        return !!line && line.charAt(0) !== "!";
      });
  }

  function lineContainsAtom(line, atomLabel) {
    var tokens = String(line || "").trim().split(/\s+/);

    return tokens.some(function (token) {
      return token === atomLabel;
    });
  }

  function unique(array) {
    var seen = {};
    var out = [];

    array.forEach(function (value) {
      value = String(value || "").trim();

      if (!value || seen[value]) {
        return;
      }

      seen[value] = true;
      out.push(value);
    });

    return out;
  }

  function sortRestraints(restraints) {
    restraints = unique(restraints);

    var sameEntries = restraints.filter(function (r) {
      return commandOfLine(r) === "SAME" || r === "SAME";
    });

    var other = restraints.filter(function (r) {
      return !(commandOfLine(r) === "SAME" || r === "SAME");
    });

    other.sort(function (a, b) {
      var ca = commandOfLine(a) || a;
      var cb = commandOfLine(b) || b;
      var ia = RESTR.indexOf(ca);
      var ib = RESTR.indexOf(cb);

      if (ia === -1) ia = RESTR.length;
      if (ib === -1) ib = RESTR.length;

      return ia - ib || ca.localeCompare(cb) || a.localeCompare(b);
    });

    return sameEntries.concat(other);
  }

  function compactCommands(lines) {
    return unique(lines.map(function (line) {
      return commandOfLine(line);
    }).filter(Boolean));
  }

  function getIsotropicComment(adpList) {
    adpList = adpList || [];

    if (!adpList.length) {
      return "";
    }

    if (adpList.every(function (adp) {
      return String(adp || "").toLowerCase() === "uiso";
    })) {
      return "isotropic refinement";
    }

    if (adpList.some(function (adp) {
      return String(adp || "").toLowerCase() === "uiso";
    })) {
      return "partially isotropic refinement";
    }

    return "";
  }

  function makeAutoComment(group) {
    var comments = [];
    var partNumber = parseInt(group.part, 10);
    var isoComment = getIsotropicComment(group.adpTypes);

    if (isFinite(partNumber) && partNumber < 0) {
      comments.push("disordered about a symmetry operation");
    }

    if (isoComment) {
      comments.push(isoComment);
    }

    return comments.join(", ");
  }

  function atomRangeText(atoms, verbose) {
    atoms = atoms || [];

    if (!atoms.length) {
      return "";
    }

    if (verbose) {
      return atoms.map(function (atom) {
        return atom.label;
      }).join(", ");
    }

    if (atoms.length === 1) {
      return atoms[0].label;
    }

    return atoms[0].label + " > " + atoms[atoms.length - 1].label;
  }

  function makeSignature(group) {
    return [
      group.assembly,
      group.part,
      group.occupancy,
      group.atoms.map(function (atom) {
        return atom.label;
      }).join(",")
    ].join("|");
  }

  function findAtomSiteLoop(parsed) {
    return CIFLord.Parser.findLoopContaining(parsed, "_atom_site_label");
  }

  function extractAtomSites(parsed) {
    var loop = findAtomSiteLoop(parsed);

    if (!loop) {
      return [];
    }

    return loop.rows.map(function (row, index) {
      var label = rowValue(loop, row, ["_atom_site_label"]);
      var element = rowValue(loop, row, ["_atom_site_type_symbol"]);

      if (!element) {
        element = elementFromAtomLabel(label);
      }

      return {
        index: index,
        label: label,
        element: normalizeElement(element),
        adpType: rowValue(loop, row, ["_atom_site_adp_type"]),
        occupancy: rowValue(loop, row, ["_atom_site_occupancy"]),
        assembly: rowValue(loop, row, ["_atom_site_disorder_assembly"]),
        group: rowValue(loop, row, ["_atom_site_disorder_group"])
      };
    }).filter(function (atom) {
      return !!atom.label;
    });
  }

  function extractDisorderSites(atomSites) {
    return atomSites.filter(function (atom) {
      return !!normalizeMissing(atom.group);
    });
  }

  function extractRestraintInformation(parsed, disorderSites) {
    var resFile = parsed.items
      ? normalizeMissing(parsed.items["_shelx_res_file"])
      : "";
    var lines = splitResLines(resFile);

    var allRestraints = [];
    var allConstraints = [];
    var allSpecial = [];

    lines.forEach(function (line) {
      var cmd = commandOfLine(line);

      if (RESTR.indexOf(cmd) !== -1) {
        allRestraints.push(line);
      }

      if (CONSTR.indexOf(cmd) !== -1) {
        allConstraints.push(line);
      }

      if (SPECIAL.indexOf(cmd) !== -1) {
        allSpecial.push(line);
      }
    });

    var disorderLabels = {};
    var atomRestraints = {};
    var atomConstraints = {};
    var sameMap = {};

    disorderSites.forEach(function (atom) {
      disorderLabels[atom.label] = true;
      atomRestraints[atom.label] = [];
      atomConstraints[atom.label] = [];
    });

    /*
      SAME assignment:
      A SAME line is assigned to the first following disordered atom line
      encountered in the embedded RES file.
    */
    var lastSame = null;

    lines.forEach(function (line) {
      var cmd = commandOfLine(line);
      var firstToken = String(line || "").trim().split(/\s+/)[0];

      if (SPECIAL.indexOf(cmd) !== -1) {
        lastSame = line;
        return;
      }

      if (lastSame && disorderLabels[firstToken]) {
        sameMap[firstToken] = lastSame;
        lastSame = null;
      }
    });

    disorderSites.forEach(function (atom) {
      allRestraints.forEach(function (line) {
        if (lineContainsAtom(line, atom.label)) {
          atomRestraints[atom.label].push(line);
        }
      });

      allConstraints.forEach(function (line) {
        if (lineContainsAtom(line, atom.label)) {
          atomConstraints[atom.label].push(line);
        }
      });

      if (sameMap[atom.label]) {
        atomRestraints[atom.label].push(sameMap[atom.label]);
      }
    });

    return {
      hasShelxResFile: !!resFile,
      lines: lines,
      allRestraints: allRestraints,
      allConstraints: allConstraints,
      allSpecial: allSpecial,
      atomRestraints: atomRestraints,
      atomConstraints: atomConstraints,
      sameMap: sameMap
    };
  }

  function mergeManualEdits(row, edits) {
    edits = edits || {};

    var edit = edits[row.signature];

    if (!edit) {
      return row;
    }

    if (typeof edit.moiety === "string") {
      row.moiety = edit.moiety;
    }

    if (typeof edit.comment === "string") {
      row.comment = edit.comment;
    }

    return row;
  }

  function buildGroups(disorderSites, options) {
    var groups = {};
    var order = [];

    disorderSites.forEach(function (atom) {
      if (options.excludeHydrogen && isHydrogenAtom(atom)) {
        return;
      }

      var key = [
        atom.assembly || "",
        atom.group || "",
        atom.occupancy || ""
      ].join("|");

      if (!groups[key]) {
        groups[key] = {
          assembly: atom.assembly || "",
          part: atom.group || "",
          occupancy: atom.occupancy || "",
          atoms: [],
          adpTypes: []
        };

        order.push(key);
      }

      groups[key].atoms.push(atom);
      groups[key].adpTypes.push(atom.adpType || "");
    });

    return order.map(function (key) {
      return groups[key];
    });
  }

  function extractFromParsed(parsed, options, edits) {
    options = options || {};
    edits = edits || {};

    var atomSites = extractAtomSites(parsed);
    var disorderSites = extractDisorderSites(atomSites);
    var restraintInfo = extractRestraintInformation(parsed, disorderSites);
    var groups = buildGroups(disorderSites, {
      excludeHydrogen: options.excludeHydrogen !== false
    });

    var rows = groups.map(function (group, index) {
      var fullRestraints = [];
      var fullConstraints = [];

      group.atoms.forEach(function (atom) {
        fullRestraints = fullRestraints.concat(
          restraintInfo.atomRestraints[atom.label] || []
        );

        fullConstraints = fullConstraints.concat(
          restraintInfo.atomConstraints[atom.label] || []
        );
      });

      fullRestraints = sortRestraints(unique(fullRestraints));
      fullConstraints = unique(fullConstraints).sort();

      var restraintsText;
      var constraintsText;

      if (options.verbose) {
        restraintsText = fullRestraints.join(", ");
        constraintsText = fullConstraints.join(", ");
      } else {
        restraintsText = sortRestraints(compactCommands(fullRestraints)).join(", ");
        constraintsText = compactCommands(fullConstraints).sort().join(", ");
      }

      var row = {
        id: "disorder_" + index,
        assembly: group.assembly,
        part: group.part,
        occupancy: group.occupancy,
        atoms: group.atoms.map(function (atom) {
          return atom.label;
        }),
        atomsText: atomRangeText(group.atoms, !!options.verbose),

        moiety: "",

        restraints: restraintsText,
        constraints: constraintsText,

        fullRestraints: fullRestraints,
        fullConstraints: fullConstraints,

        autoComment: makeAutoComment(group),
        comment: makeAutoComment(group),

        hasShelxResFile: restraintInfo.hasShelxResFile
      };

      row.signature = makeSignature({
        assembly: row.assembly,
        part: row.part,
        occupancy: row.occupancy,
        atoms: group.atoms
      });

      return mergeManualEdits(row, edits);
    });

    return {
      atomSiteCount: atomSites.length,
      disorderSiteCount: disorderSites.length,
      rowCount: rows.length,
      hasShelxResFile: restraintInfo.hasShelxResFile,
      rows: rows
    };
  }

  function ensureState(state) {
    state.disorderOptions = state.disorderOptions || {
      excludeHydrogen: true,
      verbose: false
    };

    if (typeof state.disorderOptions.excludeHydrogen !== "boolean") {
      state.disorderOptions.excludeHydrogen = true;
    }

    if (typeof state.disorderOptions.verbose !== "boolean") {
      state.disorderOptions.verbose = false;
    }

    state.disorderRows = state.disorderRows || [];
    state.disorderEdits = state.disorderEdits || {};
  }

  function regenerateFromParsed(state) {
    ensureState(state);

    if (!state.parsedCif) {
      state.disorderRows = [];
      return {
        atomSiteCount: 0,
        disorderSiteCount: 0,
        rowCount: 0,
        hasShelxResFile: false,
        rows: []
      };
    }

    var extracted = extractFromParsed(
      state.parsedCif,
      state.disorderOptions,
      state.disorderEdits
    );

    state.disorderRows = extracted.rows;
    state.disorderSummary = {
      atomSiteCount: extracted.atomSiteCount,
      disorderSiteCount: extracted.disorderSiteCount,
      rowCount: extracted.rowCount,
      hasShelxResFile: extracted.hasShelxResFile
    };

    return extracted;
  }

  function renderMoietyDatalist() {
    var list = $("disorder-moiety-list");

    if (!list) {
      return;
    }

    var labels = CIFLord.MoietyLibraryLabels || [];

    list.innerHTML = labels.map(function (label) {
      return "<option value=\"" + escapeHtml(label) + "\"></option>";
    }).join("");
  }

  function renderSummary(state) {
    if (!state.hasLoadedCif) {
      setText("disorder-summary", "No CIF loaded.");
      return;
    }

    var summary = state.disorderSummary || {};
    var parts = [];

    parts.push((summary.disorderSiteCount || 0) + " disordered atom site(s)");
    parts.push((summary.rowCount || 0) + " disorder group row(s)");

    if (summary.hasShelxResFile) {
      parts.push("SHELXL RES file found");
    } else {
      parts.push("no embedded SHELXL RES file found");
    }

    setText("disorder-summary", parts.join(" · "));
  }

  function makeDisorderTable(rows) {
    if (!rows.length) {
      return "<p class=\"hint\">No disorder groups found.</p>";
    }

    var body = rows.map(function (row) {
      return (
        "<tr>" +
          "<td>" + escapeHtml(row.assembly || "—") + "</td>" +
          "<td class=\"number\">" + escapeHtml(row.part || "—") + "</td>" +
          "<td class=\"number\">" + escapeHtml(row.occupancy || "—") + "</td>" +
          "<td>" + escapeHtml(row.atomsText || "") + "</td>" +
          "<td>" +
            "<input class=\"disorder-moiety-input\" " +
              "type=\"text\" " +
              "list=\"disorder-moiety-list\" " +
              "data-disorder-moiety=\"" + escapeHtml(row.signature) + "\" " +
              "value=\"" + escapeHtml(row.moiety || "") + "\">" +
          "</td>" +
          "<td>" + escapeHtml(row.restraints || "") + "</td>" +
          "<td>" + escapeHtml(row.constraints || "") + "</td>" +
          "<td>" +
            "<textarea class=\"disorder-comment-input\" " +
              "rows=\"2\" " +
              "data-disorder-comment=\"" + escapeHtml(row.signature) + "\">" +
              escapeHtml(row.comment || "") +
            "</textarea>" +
          "</td>" +
        "</tr>"
      );
    }).join("");

    return (
      "<table class=\"data-table disorder-table\">" +
        "<thead>" +
          "<tr>" +
            "<th>Assembly</th>" +
            "<th>Part</th>" +
            "<th>Occupancy</th>" +
            "<th>Atoms</th>" +
            "<th>Moiety</th>" +
            "<th>Restraints</th>" +
            "<th>Constraints</th>" +
            "<th>Comment</th>" +
          "</tr>" +
        "</thead>" +
        "<tbody>" + body + "</tbody>" +
      "</table>"
    );
  }

  function render(state) {
    ensureState(state);
    renderMoietyDatalist();

    var excludeH = $("opt-disorder-exclude-h");
    var verbose = $("opt-disorder-verbose");

    if (excludeH) {
      excludeH.checked = !!state.disorderOptions.excludeHydrogen;
    }

    if (verbose) {
      verbose.checked = !!state.disorderOptions.verbose;
    }

    if (!state.hasLoadedCif) {
      renderSummary(state);
      setHTML("disorder-table", "<p class=\"hint\">No CIF loaded.</p>");
      return;
    }

    renderSummary(state);
    setHTML("disorder-table", makeDisorderTable(state.disorderRows || []));
  }

  function saveEdit(state, signature, key, value) {
    ensureState(state);

    state.disorderEdits[signature] = state.disorderEdits[signature] || {};
    state.disorderEdits[signature][key] = value;

    (state.disorderRows || []).forEach(function (row) {
      if (row.signature === signature) {
        row[key] = value;
      }
    });
  }

  function maybeAutofillCommentFromMoiety(state, signature, moietyValue) {
    var entry = CIFLord.findMoietyLibraryEntry
      ? CIFLord.findMoietyLibraryEntry(moietyValue)
      : null;

    if (!entry || !entry.defaultComment) {
      return;
    }

    var row = (state.disorderRows || []).find(function (r) {
      return r.signature === signature;
    });

    if (!row) {
      return;
    }

    /*
      Only auto-fill if the user has not entered a custom comment yet,
      or if the current comment is still the automatically generated one.
    */
    var current = String(row.comment || "").trim();
    var automatic = String(row.autoComment || "").trim();

    if (current && current !== automatic) {
      return;
    }

    var comment = entry.defaultComment;

    if (automatic) {
      comment += ", " + automatic;
    }

    saveEdit(state, signature, "comment", comment);
  }

  CIFLord.DisorderHelper = {
    extractFromParsed: extractFromParsed,
    regenerateFromParsed: regenerateFromParsed,

    init: function (state, renderAll) {
      ensureState(state);

      var excludeH = $("opt-disorder-exclude-h");
      var verbose = $("opt-disorder-verbose");
      var regenerate = $("btn-disorder-regenerate");
      var clearEdits = $("btn-disorder-clear-edits");
      var tableBox = $("disorder-table");

      if (excludeH) {
        excludeH.addEventListener("change", function () {
          state.disorderOptions.excludeHydrogen = this.checked;
          regenerateFromParsed(state);
          renderAll();
        });
      }

      if (verbose) {
        verbose.addEventListener("change", function () {
          state.disorderOptions.verbose = this.checked;
          regenerateFromParsed(state);
          renderAll();
        });
      }

      if (regenerate) {
        regenerate.addEventListener("click", function () {
          regenerateFromParsed(state);
          renderAll();
        });
      }

      if (clearEdits) {
        clearEdits.addEventListener("click", function () {
          state.disorderEdits = {};
          regenerateFromParsed(state);
          renderAll();
        });
      }

      if (tableBox) {
        tableBox.addEventListener("input", function (event) {
          var target = event.target;

          if (target.matches("[data-disorder-moiety]")) {
            var signature = target.getAttribute("data-disorder-moiety");
            saveEdit(state, signature, "moiety", target.value);
            return;
          }

          if (target.matches("[data-disorder-comment]")) {
            saveEdit(
              state,
              target.getAttribute("data-disorder-comment"),
              "comment",
              target.value
            );
          }
        });

        tableBox.addEventListener("change", function (event) {
          var target = event.target;

          if (target.matches("[data-disorder-moiety]")) {
            var signature = target.getAttribute("data-disorder-moiety");
            saveEdit(state, signature, "moiety", target.value);
            maybeAutofillCommentFromMoiety(state, signature, target.value);
            renderAll();
          }
        });
      }

      renderMoietyDatalist();
    },

    render: render
  };
})();