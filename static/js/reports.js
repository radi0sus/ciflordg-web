(function () {
  "use strict";

  window.CIFLord = window.CIFLord || {};

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function cleanValue(value) {
    value = String(value || "").trim();

    if (
      (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") ||
      (value.charAt(0) === "\"" && value.charAt(value.length - 1) === "\"")
    ) {
      value = value.slice(1, -1);
    }

    return value;
  }

  function isMissing(value) {
    value = String(value || "").trim();
    return !value || value === "." || value === "?";
  }

  function getItem(state, names) {
    var items = state.items || {};

    for (var i = 0; i < names.length; i++) {
      var value = items[names[i]];

      if (!isMissing(value)) {
        return cleanValue(value);
      }
    }

    return "";
  }

  function typographicMinus(value) {
    return String(value || "").replace(/-/g, "–");
  }

  var subDigits = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
    ".": "."
  };

  var supChars = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻"
  };

  var unicodeSubscriptMap = {
    "0": "₀",
    "1": "₁",
    "2": "₂",
    "3": "₃",
    "4": "₄",
    "5": "₅",
    "6": "₆",
    "7": "₇",
    "8": "₈",
    "9": "₉",
    "+": "₊",
    "-": "₋",
    "a": "ₐ",
    "e": "ₑ",
    "h": "ₕ",
    "i": "ᵢ",
    "j": "ⱼ",
    "k": "ₖ",
    "l": "ₗ",
    "m": "ₘ",
    "n": "ₙ",
    "o": "ₒ",
    "p": "ₚ",
    "r": "ᵣ",
    "s": "ₛ",
    "t": "ₜ",
    "u": "ᵤ",
    "v": "ᵥ",
    "x": "ₓ"
  };

  function toSubscript(str) {
    return String(str || "").replace(/[0-9.]/g, function (ch) {
      return subDigits[ch] || ch;
    });
  }

  function toSuperscript(str) {
    return String(str || "").replace(/[0-9+-]/g, function (ch) {
      return supChars[ch] || ch;
    });
  }

  function toUnicodeSubscriptText(str) {
    return String(str || "").replace(/[A-Za-z0-9+\-]/g, function (ch) {
      return unicodeSubscriptMap[ch.toLowerCase()] || ch;
    });
  }

  function formatFormulaText(formula) {
    formula = cleanValue(formula);

    if (!formula) {
      return "";
    }

    var parts = formula.split(/(,\s*)/);

    return parts.map(function (part) {
      if (/^,\s*$/.test(part)) {
        return ", ";
      }

      var s = part.trim();

      s = s.replace(/([A-Z][a-z]?)(\d+(?:\.\d+)?)/g, function (_, el, num) {
        return el + toSubscript(num);
      });

      s = s.replace(/\s+/g, "");

      s = s.replace(/(\d+)([+-])/g, function (_, num, sign) {
        return toSuperscript(num + sign);
      });

      s = s.replace(/([+-])/g, function (_, sign) {
        return toSuperscript(sign);
      });

      return s;
    }).join("");
  }

  function formatSpaceGroupHtml(spaceGroup, itNumber) {
    var sg = cleanValue(spaceGroup).replace(/\s+/g, "");

    if (!sg) {
      return "";
    }

    sg = sg.replace(/([2346])([123456])/g, function (_, axis, screw) {
      return axis + toSubscript(screw);
    });

    sg = sg.replace(/[A-Za-z]/g, function (letter) {
      return "<i>" + letter + "</i>";
    });

    if (itNumber) {
      sg += " (No. " + escapeHtml(itNumber) + ")";
    }

    return sg;
  }

  function atomElement(label) {
    var m = String(label || "").match(/^([A-Z][a-z]?)/);
    return m ? m[1] : "";
  }

  function itemAtomLabels(item) {
    var text = String(item.atomsText || "");

    text = text.replace(/\^[A-Za-zIVXLCDM]+/g, "");
    text = text.replace(/'{1,3}(?=\.{3}|-|$)/g, "");

    return text.split(/\.{3}|-/).filter(Boolean);
  }

  function itemMatchesFilter(item, filter) {
    filter = filter || {};

    var element = filter.element || "all";
    var atom = filter.atom || "all";
    var labels = itemAtomLabels(item);

    if (atom !== "all") {
      return labels.indexOf(atom) !== -1;
    }

    if (element !== "all") {
      return labels.some(function (label) {
        return atomElement(label) === element;
      });
    }

    return true;
  }

  function filtered(list, filter) {
    return list.filter(function (item) {
      return itemMatchesFilter(item, filter);
    });
  }

  function isIndependentItem(item) {
    return !item.symRefs || item.symRefs.length === 0;
  }

  function independentOnlyEnabled(state) {
    return !!(
      state.selectionOptions &&
      state.selectionOptions.independentOnly
    );
  }

  function applyIndependentOnly(items, state) {
    if (!independentOnlyEnabled(state)) {
      return items;
    }

    return items.filter(isIndependentItem);
  }

  function middleAtomOnlyEnabled(state) {
    return !!(
      state.reportOptions &&
      state.reportOptions.middleAtomOnly
    );
  }

  function itemMatchesMiddleAtomFilter(item, filter) {
    var labels = itemAtomLabels(item);

    if (labels.length !== 3) {
      return true;
    }

    var middle = labels[1] || "";
    var element = filter.element || "all";
    var atom = filter.atom || "all";

    if (atom !== "all") {
      return middle === atom;
    }

    if (element !== "all") {
      return atomElement(middle) === element;
    }

    return true;
  }

  function applyMiddleAtomOnlyToAngles(items, state, filter) {
    if (!middleAtomOnlyEnabled(state)) {
      return items;
    }

    return items.filter(function (item) {
      return itemMatchesMiddleAtomFilter(item, filter);
    });
  }

  function isPrimeSymmetrySymbol(symbol) {
    return symbol === "'" || symbol === "''" || symbol === "'''";
  }

  function formatSymmetrySymbolHtml(symbol) {
    if (!symbol) {
      return "";
    }

    if (isPrimeSymmetrySymbol(symbol)) {
      return symbol;
    }

    return "<sup>" + symbol + "</sup>";
  }

  function formatSymmetrySymbolText(symbol) {
    return String(symbol || "");
  }

  function formatSymmetryOperationHtml(operation) {
    return escapeHtml(typographicMinus(operation || "")).replace(/([xyz])/g, "<i>$1</i>");
  }

  function formatSymmetryOperationMarkdown(operation) {
    return typographicMinus(operation || "").replace(/([xyz])/g, "*$1*");
  }
  
  function decodeHtmlEntities(str) {
    return String(str || "")
      .replace(/&ndash;/g, "–")
      .replace(/&middot;&middot;&middot;/g, "···")
      .replace(/&middot;/g, "·")
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&");
  }

  function inlineHtmlToMarkdown(str) {
    var s = String(str || "");

    s = decodeHtmlEntities(s);

    s = s.replace(/<strong>(.*?)<\/strong>/g, function (_, inner) {
      return "**" + inlineHtmlToMarkdown(inner) + "**";
    });

    s = s.replace(/<b>(.*?)<\/b>/g, function (_, inner) {
      return "**" + inlineHtmlToMarkdown(inner) + "**";
    });

    s = s.replace(/<i>(.*?)<\/i>/g, function (_, inner) {
      return "*" + inlineHtmlToMarkdown(inner) + "*";
    });

    s = s.replace(/<sub>(.*?)<\/sub>/g, function (_, inner) {
      return toUnicodeSubscriptText(decodeHtmlEntities(inner));
    });

    s = s.replace(/<sup>(.*?)<\/sup>/g, function (_, inner) {
      inner = decodeHtmlEntities(inner);

      if (inner === "'" || inner === "''" || inner === "'''") {
        return inner;
      }

      return "^" + inner;
    });

    s = s.replace(/<[^>]+>/g, "");

    return decodeHtmlEntities(s);
  }

  function markdownCell(str) {
    return inlineHtmlToMarkdown(str).replace(/\|/g, "\\|");
  }

  function stripHtml(html) {
    return String(html || "")
      .replace(/<sup>(.*?)<\/sup>/g, "^$1")
      .replace(/<sub>(.*?)<\/sub>/g, "$1")
      .replace(/<i>(.*?)<\/i>/g, "$1")
      .replace(/<strong>(.*?)<\/strong>/g, "$1")
      .replace(/<b>(.*?)<\/b>/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/&ndash;/g, "–")
      .replace(/&middot;&middot;&middot;/g, "···")
      .replace(/&middot;/g, "·")
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&");
  }

  function stripMarkdown(md) {
    return String(md || "")
      .replace(/\*\*Figure x\.\*\*/g, "Figure x.")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/<sup>(.*?)<\/sup>/g, "^$1")
      .replace(/<sub>(.*?)<\/sub>/g, "$1")
      .replace(/<i>(.*?)<\/i>/g, "$1")
      .replace(/<strong>(.*?)<\/strong>/g, "$1")
      .replace(/<b>(.*?)<\/b>/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/&ndash;/g, "–")
      .replace(/&middot;&middot;&middot;/g, "···")
      .replace(/&middot;/g, "·")
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&");
  }

  function useSiUnits(state) {
    return !!(state.reportOptions && state.reportOptions.siUnits);
  }

  function labelWithUnit(state, label, unit) {
    if (!unit) {
      return label;
    }

    return useSiUnits(state)
      ? label + " /" + unit
      : label + " [" + unit + "]";
  }

  function titleWithUnit(state, title, unit) {
    if (!unit) {
      return title;
    }

    return useSiUnits(state)
      ? title + " /" + unit
      : title + " [" + unit + "]";
  }

  function getSortOptions(state) {
    return state.sortOptions || {
      bonds: "cif",
      angles: "cif"
    };
  }

  function sortLabel(item) {
    return String(item.atomsText || "")
      .replace(/\^[A-Za-zIVXLCDM]+/g, "")
      .replace(/'{1,3}(?=\.{3}|-|$)/g, "")
      .toLowerCase();
  }

  function sortItems(items, mode) {
    var withIndex = items.map(function (item, index) {
      return {
        item: item,
        index: index
      };
    });

    if (!mode || mode === "cif") {
      return items.slice();
    }

    withIndex.sort(function (a, b) {
      if (mode === "atoms-asc") {
        return sortLabel(a.item).localeCompare(sortLabel(b.item)) || a.index - b.index;
      }

      if (mode === "atoms-desc") {
        return sortLabel(b.item).localeCompare(sortLabel(a.item)) || a.index - b.index;
      }

      if (mode === "value-asc") {
        return (a.item.numericalValue - b.item.numericalValue) || a.index - b.index;
      }

      if (mode === "value-desc") {
        return (b.item.numericalValue - a.item.numericalValue) || a.index - b.index;
      }

      return a.index - b.index;
    });

    return withIndex.map(function (entry) {
      return entry.item;
    });
  }

  function hklPart(min, max) {
    if (isMissing(min) || isMissing(max)) {
      return "";
    }

    var minNum = parseInt(min, 10);
    var maxNum = parseInt(max, 10);

    if (
      isFinite(minNum) &&
      isFinite(maxNum) &&
      minNum === -maxNum
    ) {
      return "±" + Math.abs(maxNum);
    }

    return typographicMinus(min) + " - " + typographicMinus(max);
  }

  function hklRange(state) {
    var h = hklPart(
      getItem(state, ["_diffrn_reflns_limit_h_min"]),
      getItem(state, ["_diffrn_reflns_limit_h_max"])
    );

    var k = hklPart(
      getItem(state, ["_diffrn_reflns_limit_k_min"]),
      getItem(state, ["_diffrn_reflns_limit_k_max"])
    );

    var l = hklPart(
      getItem(state, ["_diffrn_reflns_limit_l_min"]),
      getItem(state, ["_diffrn_reflns_limit_l_max"])
    );

    return [h, k, l].filter(Boolean).join(", ");
  }

  function makeCrystalRows(state) {
    var rows = [];

    var formula = getItem(state, ["_chemical_formula_sum"]);
    var moiety = getItem(state, ["_chemical_formula_moiety"]);
    var formulaWeight = getItem(state, ["_chemical_formula_weight"]);
    var temp = getItem(state, ["_diffrn_ambient_temperature", "_cell_measurement_temperature"]);
    var crystalSystem = getItem(state, ["_space_group_crystal_system", "_symmetry_cell_setting"]);
    var spaceGroup = getItem(state, ["_space_group_name_H-M_alt", "_symmetry_space_group_name_H-M"]);
    var itNumber = getItem(state, ["_space_group_IT_number"]);
    var sizeMax = getItem(state, ["_exptl_crystal_size_max"]);
    var sizeMid = getItem(state, ["_exptl_crystal_size_mid"]);
    var sizeMin = getItem(state, ["_exptl_crystal_size_min"]);
    var thetaMin = getItem(state, ["_diffrn_reflns_theta_min", "_cell_measurement_theta_min"]);
    var thetaMax = getItem(state, ["_diffrn_reflns_theta_max", "_cell_measurement_theta_max"]);
    var rInt = getItem(state, ["_diffrn_reflns_av_R_equivalents"]);
    var unique = getItem(state, ["_reflns_number_total"]);
    var rGt = getItem(state, ["_refine_ls_R_factor_gt"]);
    var wrGt = getItem(state, ["_refine_ls_wR_factor_gt"]);
    var rAll = getItem(state, ["_refine_ls_R_factor_all"]);
    var wrAll = getItem(state, ["_refine_ls_wR_factor_ref"]);
    var diffMin = getItem(state, ["_refine_diff_density_min"]);
    var diffMax = getItem(state, ["_refine_diff_density_max"]);
    var tMin = getItem(state, [
      "_exptl_absorpt_correction_T_min",
      "_exptl_transmission_factor_min",
      "_shelx_estimated_absorpt_T_min"
    ]);
    var tMax = getItem(state, [
      "_exptl_absorpt_correction_T_max",
      "_exptl_transmission_factor_max",
      "_shelx_estimated_absorpt_T_max"
    ]);

    function add(labelHtml, valueHtml, labelText, valueText) {
      if (!isMissing(valueText !== undefined ? valueText : valueHtml)) {
        rows.push({
          labelHtml: labelHtml,
          valueHtml: valueHtml,
          labelText: labelText || stripHtml(labelHtml),
          valueText: valueText || stripHtml(valueHtml)
        });
      }
    }

    add("empirical formula", escapeHtml(formatFormulaText(formula)), "empirical formula", formatFormulaText(formula));
    add("moiety formula", escapeHtml(formatFormulaText(moiety)), "moiety formula", formatFormulaText(moiety));
    add("formula weight", escapeHtml(formulaWeight));

    add(labelWithUnit(state, "<i>T</i>", "K"), escapeHtml(temp), labelWithUnit(state, "T", "K"), temp);

    if (sizeMax || sizeMid || sizeMin) {
      var size = [sizeMax, sizeMid, sizeMin].filter(Boolean).join(" × ");
      add(labelWithUnit(state, "crystal size", "mm³"), escapeHtml(size), labelWithUnit(state, "crystal size", "mm³"), size);
    }

    add("crystal system", escapeHtml(crystalSystem));

    if (spaceGroup) {
      var sgHtml = formatSpaceGroupHtml(spaceGroup, itNumber);
      var sgText = stripHtml(sgHtml);
      add("space group", sgHtml, "space group", sgText);
    }

    add(labelWithUnit(state, "<i>a</i>", "Å"), escapeHtml(getItem(state, ["_cell_length_a"])), labelWithUnit(state, "a", "Å"), getItem(state, ["_cell_length_a"]));
    add(labelWithUnit(state, "<i>b</i>", "Å"), escapeHtml(getItem(state, ["_cell_length_b"])), labelWithUnit(state, "b", "Å"), getItem(state, ["_cell_length_b"]));
    add(labelWithUnit(state, "<i>c</i>", "Å"), escapeHtml(getItem(state, ["_cell_length_c"])), labelWithUnit(state, "c", "Å"), getItem(state, ["_cell_length_c"]));
    add(labelWithUnit(state, "<i>α</i>", "°"), escapeHtml(getItem(state, ["_cell_angle_alpha"])), labelWithUnit(state, "α", "°"), getItem(state, ["_cell_angle_alpha"]));
    add(labelWithUnit(state, "<i>β</i>", "°"), escapeHtml(getItem(state, ["_cell_angle_beta"])), labelWithUnit(state, "β", "°"), getItem(state, ["_cell_angle_beta"]));
    add(labelWithUnit(state, "<i>γ</i>", "°"), escapeHtml(getItem(state, ["_cell_angle_gamma"])), labelWithUnit(state, "γ", "°"), getItem(state, ["_cell_angle_gamma"]));
    add(labelWithUnit(state, "<i>V</i>", "Å³"), escapeHtml(getItem(state, ["_cell_volume"])), labelWithUnit(state, "V", "Å³"), getItem(state, ["_cell_volume"]));

    add("<i>Z</i>", escapeHtml(getItem(state, ["_cell_formula_units_Z"])), "Z", getItem(state, ["_cell_formula_units_Z"]));
    add(labelWithUnit(state, "<i>ρ</i>", "g·cm⁻³"), escapeHtml(getItem(state, ["_exptl_crystal_density_diffrn"])), labelWithUnit(state, "ρ", "g·cm⁻³"), getItem(state, ["_exptl_crystal_density_diffrn"]));
    add("<i>F</i>(000)", escapeHtml(getItem(state, ["_exptl_crystal_F_000"])), "F(000)", getItem(state, ["_exptl_crystal_F_000"]));
    add(labelWithUnit(state, "<i>µ</i>", "mm⁻¹"), escapeHtml(getItem(state, ["_exptl_absorpt_coefficient_mu"])), labelWithUnit(state, "µ", "mm⁻¹"), getItem(state, ["_exptl_absorpt_coefficient_mu"]));

    if (tMin || tMax) {
      add("<i>T</i><sub>min</sub> / <i>T</i><sub>max</sub>", escapeHtml((tMin || "?") + " / " + (tMax || "?")), "Tmin / Tmax", (tMin || "?") + " / " + (tMax || "?"));
    }

    if (thetaMin || thetaMax) {
      var theta = typographicMinus(thetaMin || "?") + " - " + typographicMinus(thetaMax || "?");
      add(labelWithUnit(state, "<i>θ</i>-range", "°"), escapeHtml(theta), labelWithUnit(state, "θ-range", "°"), theta);
    }

    var hkl = hklRange(state);

    if (hkl) {
      add("<i>hkl</i>-range", escapeHtml(hkl), "hkl-range", hkl);
    }

    add("measured refl.", escapeHtml(getItem(state, ["_diffrn_reflns_number"])), "measured refl.", getItem(state, ["_diffrn_reflns_number"]));

    if (unique || rInt) {
      var uniqueText = (unique || "?") + (rInt ? " [" + rInt + "]" : "");
      add("unique refl. [<i>R</i><sub>int</sub>]", escapeHtml(uniqueText), "unique refl. [Rint]", uniqueText);
    }

    add("observed refl. (<i>I</i> &gt; 2σ(<i>I</i>))", escapeHtml(getItem(state, ["_reflns_number_gt"])), "observed refl. (I > 2σ(I))", getItem(state, ["_reflns_number_gt"]));

    var reflns = getItem(state, ["_refine_ls_number_reflns", "_reflns_number_total"]);
    var restraints = getItem(state, ["_refine_ls_number_restraints"]);
    var params = getItem(state, ["_refine_ls_number_parameters"]);

    if (reflns || restraints || params) {
      var d = [reflns || "?", restraints || "?", params || "?"].join(" / ");
      add("data / restraints / param.", escapeHtml(d), "data / restraints / param.", d);
    }

    add("goodness-of-fit (<i>F</i>²)", escapeHtml(getItem(state, ["_refine_ls_goodness_of_fit_ref"])), "goodness-of-fit (F²)", getItem(state, ["_refine_ls_goodness_of_fit_ref"]));

    if (rGt || wrGt) {
      var rgtText = (rGt || "?") + " / " + (wrGt || "?");
      add("<i>R</i>1, <i>wR</i>2 (<i>I</i> &gt; 2σ(<i>I</i>))", escapeHtml(rgtText), "R1, wR2 (I > 2σ(I))", rgtText);
    }

    if (rAll || wrAll) {
      var rallText = (rAll || "?") + " / " + (wrAll || "?");
      add("<i>R</i>1, <i>wR</i>2 (all data)", escapeHtml(rallText), "R1, wR2 (all data)", rallText);
    }

    if (diffMin || diffMax) {
      var diff = typographicMinus(diffMin || "?") + " / " + typographicMinus(diffMax || "?");
      add(labelWithUnit(state, "res. el. dens.", "e·Å⁻³"), escapeHtml(diff), labelWithUnit(state, "res. el. dens.", "e·Å⁻³"), diff);
    }

    return rows;
  }

  function getReportModel(state) {
    var reportFilter = state.selectionFilter || {
      element: "all",
      atom: "all"
    };

    var sortOptions = getSortOptions(state);

    var bonds = state.reportOptions.showBonds
      ? filtered(state.bonds, reportFilter)
      : [];

    var angles = state.reportOptions.showAngles
      ? filtered(state.angles, reportFilter)
      : [];

    bonds = applyIndependentOnly(bonds, state);
    angles = applyIndependentOnly(angles, state);
    angles = applyMiddleAtomOnlyToAngles(angles, state, reportFilter);

    bonds = sortItems(bonds, sortOptions.bonds);
    angles = sortItems(angles, sortOptions.angles);

    var added = filtered(
      CIFLord.Core.getSelectedForReport(state, "addedDistances"),
      reportFilter
    );

    var mergedBonds = bonds.slice();
    var separateAdded = [];

    if (state.reportOptions.addedDisplay === "merge") {
      mergedBonds = mergedBonds.concat(added);
    } else {
      separateAdded = added;
    }

    var allForSymmetry = mergedBonds.concat(separateAdded).concat(angles);
    var symmetryNotes = CIFLord.Core.usedSymmetryNotes(state, allForSymmetry);

    return {
      dataName: state.dataName || "untitled",
      crystalRows: makeCrystalRows(state),
      bonds: mergedBonds,
      angles: angles,
      addedDistances: separateAdded,
      symmetryNotes: symmetryNotes
    };
  }

  function htmlKeyValueTable(title, rows) {
    if (!rows.length) {
      return "";
    }

    return (
      "<h2>" + escapeHtml(title) + "</h2>" +
      "<table>" +
        "<tbody>" +
          rows.map(function (row) {
            return (
              "<tr>" +
                "<td>" + row.labelHtml + "</td>" +
                "<td>" + row.valueHtml + "</td>" +
              "</tr>"
            );
          }).join("") +
        "</tbody>" +
      "</table>"
    );
  }

  function htmlValueTable(title, items, valueHeader) {
    if (!items.length) {
      return "";
    }

    return (
      "<h2>" + escapeHtml(title) + "</h2>" +
      "<table>" +
        "<thead>" +
          "<tr>" +
            "<th>Atoms</th>" +
            "<th>" + escapeHtml(valueHeader) + "</th>" +
          "</tr>" +
        "</thead>" +
        "<tbody>" +
          items.map(function (item) {
            return (
              "<tr>" +
                "<td>" + item.atomsHtml + "</td>" +
                "<td class=\"number\">" + escapeHtml(item.value) + "</td>" +
              "</tr>"
            );
          }).join("") +
        "</tbody>" +
      "</table>"
    );
  }

  function htmlSymmetrySentence(notes) {
    if (!notes.length) {
      return "";
    }

    var label = notes.length === 1
      ? "Symmetry transformation used to generate equivalent atoms:"
      : "Symmetry transformations used to generate equivalent atoms:";

    var text = notes.map(function (note) {
      return "(" + escapeHtml(formatSymmetrySymbolText(note.symbol)) + ") " +
        formatSymmetryOperationHtml(note.operation);
    }).join("; ");

    return label + " " + text + ".";
  }

  function markdownSymmetrySentence(notes) {
    if (!notes.length) {
      return "";
    }

    var label = notes.length === 1
      ? "Symmetry transformation used to generate equivalent atoms:"
      : "Symmetry transformations used to generate equivalent atoms:";

    var text = notes.map(function (note) {
      return "(" + formatSymmetrySymbolText(note.symbol) + ") " +
        formatSymmetryOperationMarkdown(note.operation);
    }).join("; ");

    return label + " " + text + ".";
  }

  function htmlSymmetryNotes(notes) {
    var sentence = htmlSymmetrySentence(notes);

    if (!sentence) {
      return "";
    }

    var split = sentence.indexOf(":");

    if (split !== -1) {
      return (
        "<p class=\"symmetry-note\"><strong>" +
        sentence.slice(0, split + 1) +
        "</strong>" +
        sentence.slice(split + 1) +
        "</p>"
      );
    }

    return "<p class=\"symmetry-note\">" + sentence + "</p>";
  }

  function makeCaptionHtml(model, state) {
    var distances = model.bonds.concat(model.addedDistances);
    var parts = [];
    var body;
    var sym;

    if (distances.length) {
      parts.push(
        distances.map(function (item) {
          return item.atomsHtml + " " + item.value;
        }).join(", ")
      );
    }

    if (model.angles.length) {
      parts.push(
        model.angles.map(function (item) {
          return item.atomsHtml + " " + item.value;
        }).join(", ")
      );
    }

    if (parts.length) {
      body =
        "Selected distances " +
        (useSiUnits(state) ? "/Å" : "[Å]") +
        " and angles " +
        (useSiUnits(state) ? "/°" : "[°]") +
        " for <strong>" +
        escapeHtml(model.dataName) +
        "</strong>: " +
        parts.join("; ") +
        ".";
    } else {
      body =
        "No values selected for <strong>" +
        escapeHtml(model.dataName) +
        "</strong>.";
    }

    sym = htmlSymmetrySentence(model.symmetryNotes);

    if (sym) {
      body += " " + sym;
    }

    return body;
  }

  function makeCaptionMarkdown(model, state) {
    var distances = model.bonds.concat(model.addedDistances);
    var parts = [];
    var body;
    var sym;

    if (distances.length) {
      parts.push(
        distances.map(function (item) {
          return inlineHtmlToMarkdown(item.atomsHtml) + " " + item.value;
        }).join(", ")
      );
    }

    if (model.angles.length) {
      parts.push(
        model.angles.map(function (item) {
          return inlineHtmlToMarkdown(item.atomsHtml) + " " + item.value;
        }).join(", ")
      );
    }

    if (parts.length) {
      body =
        "Selected distances " +
        (useSiUnits(state) ? "/Å" : "[Å]") +
        " and angles " +
        (useSiUnits(state) ? "/°" : "[°]") +
        " for **" +
        model.dataName +
        "**: " +
        parts.join("; ") +
        ".";
    } else {
      body = "No values selected for **" + model.dataName + "**.";
    }

    sym = markdownSymmetrySentence(model.symmetryNotes);

    if (sym) {
      body += " " + sym;
    }

    return body;
  }

  function renderHTMLPreview(state) {
    var model = getReportModel(state);
    var html = "";

    html += "<h1>" + escapeHtml(model.dataName) + "</h1>";

    html += htmlKeyValueTable(
      "Crystal data and refinement details",
      model.crystalRows
    );

    if (model.bonds.length) {
      html += htmlValueTable(
        state.reportOptions.addedDisplay === "merge"
          ? titleWithUnit(state, "Selected bond lengths and interatomic distances", "Å")
          : titleWithUnit(state, "Selected bond lengths", "Å"),
        model.bonds,
        "Distance"
      );
    }

    if (model.addedDistances.length) {
      html += htmlValueTable(
        titleWithUnit(state, "Additional interatomic distances", "Å"),
        model.addedDistances,
        "Distance"
      );
    }

    if (model.angles.length) {
      html += htmlValueTable(
        titleWithUnit(state, "Selected bond angles", "°"),
        model.angles,
        "Angle"
      );
    }

    if (!model.bonds.length && !model.addedDistances.length && !model.angles.length) {
      html += "<p class=\"hint\">No values selected for the current element/atom selection.</p>";
    }

    html += htmlSymmetryNotes(model.symmetryNotes);

    if (state.reportOptions.showCaption) {
      html += "<h2>Figure caption</h2>";
      html += "<p><strong>Figure x.</strong> " + makeCaptionHtml(model, state) + "</p>";
    }

    return html;
  }

  function mdKeyValueTable(tableNumber, title, rows, dataName) {
    var out = "";
  
    if (!rows.length) {
      return "";
    }
  
    out += "## Table " + tableNumber + ": " + title + " for **" + dataName + "**.\n\n";
    out += "| Parameter | Value |\n";
    out += "|---|---|\n";
  
    rows.forEach(function (row) {
      out += "| " + markdownCell(row.labelHtml) + " | " + markdownCell(row.valueHtml) + " |\n";
    });
  
    out += "\n";
    return out;
  }

  function mdValueTable(tableNumber, title, items, valueHeader, dataName) {
    var out = "";
  
    if (!items.length) {
      return "";
    }
  
    out += "## Table " + tableNumber + ": " + title + " for **" + dataName + "**.\n\n";
    out += "| Atoms | " + valueHeader + " |\n";
    out += "|---|---:|\n";
  
    items.forEach(function (item) {
      out += "| " + markdownCell(item.atomsHtml) + " | " + markdownCell(item.value) + " |\n";
    });
  
    out += "\n";
    return out;
  }

  function makeMarkdown(state) {
    var model = getReportModel(state);
    var tableNumber = 1;
    var out = "# " + model.dataName + "\n\n";
  
    if (model.crystalRows.length) {
      out += mdKeyValueTable(
        tableNumber++,
        "Crystal data and refinement details",
        model.crystalRows,
        model.dataName
      );
    }

    if (model.bonds.length) {
      out += mdValueTable(
        tableNumber++,
        state.reportOptions.addedDisplay === "merge"
          ? titleWithUnit(state, "Selected bond lengths and interatomic distances", "Å")
          : titleWithUnit(state, "Selected bond lengths", "Å"),
        model.bonds,
        "Distance",
        model.dataName
      );
    }

    if (model.addedDistances.length) {
      out += mdValueTable(
        tableNumber++,
        titleWithUnit(state, "Additional interatomic distances", "Å"),
        model.addedDistances,
        "Distance",
        model.dataName
      );
    }

    if (model.angles.length) {
      out += mdValueTable(
        tableNumber++,
        titleWithUnit(state, "Selected bond angles", "°"),
        model.angles,
        "Angle",
        model.dataName
      );
    }

    if (!model.bonds.length && !model.addedDistances.length && !model.angles.length) {
      out += "No values selected for the current element/atom selection.\n\n";
    }

    if (model.symmetryNotes.length) {
      out += markdownSymmetrySentence(model.symmetryNotes) + "\n\n";
    }

    if (state.reportOptions.showCaption) {
      out += "## Figure caption\n\n";
      out += "**Figure x.** " + makeCaptionMarkdown(model, state) + "\n";
    }

    return out;
  }

  function padRight(str, width) {
    str = String(str || "");

    if (str.length >= width) {
      return str;
    }

    return str + " ".repeat(width - str.length);
  }

  function plainLine(title) {
    var line = String(title || "");
    return line + "\n" + "-".repeat(line.length) + "\n";
  }

  function plainInline(html) {
    return stripHtml(html)
      .replace(/\^'/g, "'")
      .replace(/\^''/g, "''")
      .replace(/\^'''/g, "'''");
  }

  function plainKeyValueTable(tableNumber, title, rows, dataName) {
    if (!rows.length) {
      return "";
    }
  
    var out = "";
    var width = 0;
    var caption = "Table " + tableNumber + ": " + title + " for " + dataName + ".";
  
    rows.forEach(function (row) {
      var label = row.labelText || plainInline(row.labelHtml);
      width = Math.max(width, label.length);
    });
  
    out += plainLine(caption);
  
    rows.forEach(function (row) {
      var label = row.labelText || plainInline(row.labelHtml);
      var value = row.valueText || plainInline(row.valueHtml);
  
      out += padRight(label, width) + "    " + value + "\n";
    });
  
    out += "\n";
    return out;
  }

  function plainValueTable(tableNumber, title, items, valueHeader, dataName) {
    if (!items.length) {
      return "";
    }
  
    var out = "";
    var atomWidth = "Atoms".length;
    var caption = "Table " + tableNumber + ": " + title + " for " + dataName + ".";
  
    items.forEach(function (item) {
      atomWidth = Math.max(atomWidth, plainInline(item.atomsHtml).length);
    });
  
    out += plainLine(caption);
    out += padRight("Atoms", atomWidth) + "    " + valueHeader + "\n";
  
    items.forEach(function (item) {
      out += padRight(plainInline(item.atomsHtml), atomWidth) + "    " + item.value + "\n";
    });
  
    out += "\n";
    return out;
  }

  function plainSymmetrySentence(notes) {
    if (!notes.length) {
      return "";
    }

    var label = notes.length === 1
      ? "Symmetry transformation used to generate equivalent atoms:"
      : "Symmetry transformations used to generate equivalent atoms:";

    var text = notes.map(function (note) {
      return "(" + formatSymmetrySymbolText(note.symbol) + ") " +
        typographicMinus(note.operation || "");
    }).join("; ");

    return label + " " + text + ".\n\n";
  }

  function plainCaption(model, state) {
    var distances = model.bonds.concat(model.addedDistances);
    var parts = [];
    var out = "";

    if (distances.length) {
      parts.push(
        distances.map(function (item) {
          return plainInline(item.atomsHtml) + " " + item.value;
        }).join(", ")
      );
    }

    if (model.angles.length) {
      parts.push(
        model.angles.map(function (item) {
          return plainInline(item.atomsHtml) + " " + item.value;
        }).join(", ")
      );
    }

    out += plainLine("Figure caption");

    if (parts.length) {
      out +=
        "Figure x. Selected distances " +
        (useSiUnits(state) ? "/Å" : "[Å]") +
        " and angles " +
        (useSiUnits(state) ? "/°" : "[°]") +
        " for " +
        model.dataName +
        ": " +
        parts.join("; ") +
        ".";
    } else {
      out += "Figure x. No values selected for " + model.dataName + ".";
    }

    if (model.symmetryNotes.length) {
      out += " " + plainSymmetrySentence(model.symmetryNotes).trim();
    }

    out += "\n";
    return out;
  }

  function makePlainText(state) {
    var model = getReportModel(state);
    var tableNumber = 1;
    var out = "";

    out += model.dataName + "\n";
    out += "=".repeat(model.dataName.length) + "\n\n";

    if (model.crystalRows.length) {
      out += plainKeyValueTable(
        tableNumber++,
        "Crystal data and refinement details",
        model.crystalRows,
        model.dataName
      );
    }

    if (model.bonds.length) {
      out += plainValueTable(
        tableNumber++,
        state.reportOptions.addedDisplay === "merge"
          ? titleWithUnit(state, "Selected bond lengths and interatomic distances", "Å")
          : titleWithUnit(state, "Selected bond lengths", "Å"),
        model.bonds,
        "Distance",
        model.dataName
      );
    }

    if (model.addedDistances.length) {
      out += plainValueTable(
        tableNumber++,
        titleWithUnit(state, "Additional interatomic distances", "Å"),
        model.addedDistances,
        "Distance",
        model.dataName
      );
    }

    if (model.angles.length) {
      out += plainValueTable(
        tableNumber++,
        titleWithUnit(state, "Selected bond angles", "°"),
        model.angles,
        "Angle",
        model.dataName
      );
    }

    if (!model.bonds.length && !model.addedDistances.length && !model.angles.length) {
      out += "No values selected for the current element/atom selection.\n\n";
    }

    out += plainSymmetrySentence(model.symmetryNotes);

    if (state.reportOptions.showCaption) {
      out += plainCaption(model, state);
    }

    return out.trim() + "\n";
  }

  function makeCSV(state) {
    var model = getReportModel(state);
    var rows = [];
  
    function asciiText(value) {
      return String(value || "")
        .replace(/–/g, "-")
        .replace(/−/g, "-");
    }
  
    function csvString(value) {
      value = asciiText(value);
  
      return "\"" + value.replace(/"/g, "\"\"") + "\"";
    }
  
    function csvNumber(value) {
      if (typeof value === "number" && isFinite(value)) {
        return String(value);
      }
  
      return "";
    }
  
    function addItem(item) {
      rows.push([
        csvString(item.kind),
        csvString(stripHtml(item.atomsHtml)),
        csvString(item.value),
        csvString(item.source),
        csvNumber(item.numericalValue)
      ]);
    }
  
    rows.push([
      "type",
      "atoms",
      "cif-value",
      "source",
      "value"
    ]);
  
    model.bonds.forEach(addItem);
    model.addedDistances.forEach(addItem);
    model.angles.forEach(addItem);
  
    return rows.map(function (row) {
      return row.join(",");
    }).join("\n");
  }

  /*
    RTF helpers
  */

  function decodeBasicEntities(str) {
    return String(str || "")
      .replace(/&ndash;/g, "–")
      .replace(/&middot;&middot;&middot;/g, "···")
      .replace(/&middot;/g, "·")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  function rtfEscape(str) {
    str = String(str || "");
    var out = "";

    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      var code = ch.charCodeAt(0);

      if (ch === "\\") {
        out += "\\\\";
      } else if (ch === "{") {
        out += "\\{";
      } else if (ch === "}") {
        out += "\\}";
      } else if (ch === "\n") {
        out += "\\par\n";
      } else if (code > 127) {
        if (code > 32767) {
          code = code - 65536;
        }
        out += "\\u" + code + "?";
      } else {
        out += ch;
      }
    }

    return out;
  }

  function rtfInlineFromHtml(html) {
    var placeholders = [];

    function stash(rtf) {
      var key = "@@RTF_PLACEHOLDER_" + placeholders.length + "@@";
      placeholders.push({
        key: key,
        rtf: rtf
      });
      return key;
    }

    var s = String(html || "");

    s = decodeBasicEntities(s);

    s = s.replace(/<sup>(.*?)<\/sup>/g, function (_, inner) {
      return stash("{\\super " + rtfEscape(decodeBasicEntities(inner)) + "}");
    });

    s = s.replace(/<sub>(.*?)<\/sub>/g, function (_, inner) {
      return stash("{\\sub " + rtfEscape(decodeBasicEntities(inner)) + "}");
    });

    s = s.replace(/<i>(.*?)<\/i>/g, function (_, inner) {
      return stash("{\\i " + rtfEscape(decodeBasicEntities(inner)) + "}");
    });

    s = s.replace(/<strong>(.*?)<\/strong>/g, function (_, inner) {
      return stash("{\\b " + rtfEscape(decodeBasicEntities(inner)) + "}");
    });

    s = s.replace(/<b>(.*?)<\/b>/g, function (_, inner) {
      return stash("{\\b " + rtfEscape(decodeBasicEntities(inner)) + "}");
    });

    s = s.replace(/<[^>]+>/g, "");

    s = rtfEscape(s);

    placeholders.forEach(function (p) {
      s = s.replace(p.key, p.rtf);
    });

    return s;
  }

  function rtfSymmetrySymbol(symbol) {
    return rtfEscape(String(symbol || ""));
  }

  function rtfSymmetryComponent(component) {
    component = String(component || "").trim().replace(/\s+/g, "");

    var m;
    var minus = rtfEscape("–");

    /*
      Prefer old-style output:
      -x+1   -> 1–x
      -z+1   -> 1–z
      -y+1/2 -> 1/2–y
    */
    m = component.match(/^-([xyz])\+(.+)$/);
    if (m) {
      return rtfEscape(m[2]) + minus + "{\\i " + m[1] + "}";
    }

    m = component.match(/^([xyz])\+(.+)$/);
    if (m) {
      return "{\\i " + m[1] + "}+" + rtfEscape(m[2]);
    }

    m = component.match(/^([xyz])-(.+)$/);
    if (m) {
      return "{\\i " + m[1] + "}" + minus + rtfEscape(m[2]);
    }

    m = component.match(/^-([xyz])$/);
    if (m) {
      return minus + "{\\i " + m[1] + "}";
    }

    m = component.match(/^([xyz])$/);
    if (m) {
      return "{\\i " + m[1] + "}";
    }

    var out = "";

    for (var i = 0; i < component.length; i++) {
      var ch = component.charAt(i);

      if (ch === "x" || ch === "y" || ch === "z") {
        out += "{\\i " + ch + "}";
      } else if (ch === "-") {
        out += minus;
      } else {
        out += rtfEscape(ch);
      }
    }

    return out;
  }

  function rtfSymmetryOperation(operation) {
    return String(operation || "")
      .split(",")
      .map(rtfSymmetryComponent)
      .join(", ");
  }

  function rtfParagraph(rtfContent) {
    return "{\\pard \\f0\\fs24 " + rtfContent + "\\par}\n";
  }

  function rtfBlankLine() {
    return "{\\pard\\plain \\f0\\fs24 \\par}\n";
  }

  function rtfTableRow(leftRtf, rightRtf, bold) {
    var l = bold ? "{\\b " + leftRtf + "}" : leftRtf;
    var r = bold ? "{\\b " + rightRtf + "}" : rightRtf;

    return (
      "{\\trowd\\trgaph108\\trql\\cellx3600\\cellx7200" +
        "\\pard\\intbl \\f0\\fs24 " + l + "\\cell" +
        "\\pard\\intbl \\f0\\fs24 " + r + "\\cell\\row}\n"
    );
  }

  function rtfKeyValueTable(tableNumber, title, rows, dataName) {
    if (!rows.length) {
      return "";
    }

    var out = "";

    out += rtfParagraph(
      "{\\b Table " + tableNumber + ": }" +
      rtfEscape(title + " for ") +
      "{\\b " + rtfEscape(dataName) + "}."
    );

    rows.forEach(function (row) {
      out += rtfTableRow(
        rtfInlineFromHtml(row.labelHtml),
        rtfInlineFromHtml(row.valueHtml),
        false
      );
    });

    out += rtfBlankLine();

    return out;
  }

  function rtfValueTable(tableNumber, title, valueHeader, items, dataName) {
    if (!items.length) {
      return "";
    }

    var out = "";

    out += rtfParagraph(
      "{\\b Table " + tableNumber + ": }" +
      rtfEscape(title + " for ") +
      "{\\b " + rtfEscape(dataName) + "}."
    );

    out += rtfTableRow(
      rtfEscape("Atoms"),
      rtfEscape(valueHeader),
      true
    );

    items.forEach(function (item) {
      out += rtfTableRow(
        rtfInlineFromHtml(item.atomsHtml),
        rtfEscape(item.value),
        false
      );
    });

    out += rtfBlankLine();

    return out;
  }

  function rtfSymmetryNotes(notes) {
    if (!notes.length) {
      return "";
    }

    var label = notes.length === 1
      ? "Symmetry transformation used to generate equivalent atoms:"
      : "Symmetry transformations used to generate equivalent atoms:";

    var text = notes.map(function (note) {
      return "(" + rtfSymmetrySymbol(note.symbol) + ") " +
        rtfSymmetryOperation(note.operation);
    }).join("; ");

    return rtfParagraph(rtfEscape(label + " ") + text + ".");
  }

  function rtfJoinItems(items) {
    return items.map(function (item) {
      return rtfInlineFromHtml(item.atomsHtml) + " " + rtfEscape(item.value);
    }).join(", ");
  }

  function rtfCaptionSymmetrySentence(notes) {
    if (!notes.length) {
      return "";
    }

    var label = notes.length === 1
      ? "Symmetry transformation used to generate equivalent atoms:"
      : "Symmetry transformations used to generate equivalent atoms:";

    var text = notes.map(function (note) {
      return "(" + rtfSymmetrySymbol(note.symbol) + ") " +
        rtfSymmetryOperation(note.operation);
    }).join("; ");

    return rtfEscape(label + " ") + text + ".";
  }

  function rtfCaption(model, state) {
    var distances = model.bonds.concat(model.addedDistances);
    var parts = [];
    var out = "";

    if (distances.length) {
      parts.push(rtfJoinItems(distances));
    }

    if (model.angles.length) {
      parts.push(rtfJoinItems(model.angles));
    }

    out += "{\\b Figure x. }";

    if (parts.length) {
      out +=
        rtfEscape("Selected distances " + (useSiUnits(state) ? "/Å" : "[Å]") +
          " and angles " + (useSiUnits(state) ? "/°" : "[°]") + " for ") +
        "{\\b " + rtfEscape(model.dataName) + "}: " +
        parts.join("; ") +
        ".";
    } else {
      out +=
        rtfEscape("No values selected for ") +
        "{\\b " + rtfEscape(model.dataName) + "}.";
    }

    var sym = rtfCaptionSymmetrySentence(model.symmetryNotes);

    if (sym) {
      out += " " + sym;
    }

    return rtfParagraph(out);
  }

  function makeRTF(state) {
    var model = getReportModel(state);
    var tableNumber = 1;
    var body = "";

    body += rtfParagraph(rtfEscape(model.dataName));
    body += rtfBlankLine();

    if (model.crystalRows.length) {
      body += rtfKeyValueTable(
        tableNumber++,
        "Crystal data and refinement details",
        model.crystalRows,
        model.dataName
      );
    }

    if (model.bonds.length) {
      body += rtfValueTable(
        tableNumber++,
        state.reportOptions.addedDisplay === "merge"
          ? titleWithUnit(state, "Selected bond lengths and interatomic distances", "Å")
          : titleWithUnit(state, "Selected bond lengths", "Å"),
        "Distance",
        model.bonds,
        model.dataName
      );
    }

    if (model.addedDistances.length) {
      body += rtfValueTable(
        tableNumber++,
        titleWithUnit(state, "Additional interatomic distances", "Å"),
        "Distance",
        model.addedDistances,
        model.dataName
      );
    }

    if (model.angles.length) {
      body += rtfValueTable(
        tableNumber++,
        titleWithUnit(state, "Selected bond angles", "°"),
        "Angle",
        model.angles,
        model.dataName
      );
    }

    body += rtfSymmetryNotes(model.symmetryNotes);

    if (state.reportOptions.showCaption) {
      body += rtfBlankLine();
      body += rtfCaption(model, state);
    }

    return (
      "{\\rtf1\\ansi\\uc1\\deff0" +
      "{\\fonttbl{\\f0\\froman Times New Roman;}}" +
      "\\paperw11909\\paperh16834\\margl1138\\margt562\\margr562\\margb562\n" +
      "\\f0\\fs24\n" +
      body +
      "\n}"
    );
  }

  CIFLord.Reports = {
    renderHTMLPreview: renderHTMLPreview,
    makeMarkdown: makeMarkdown,
    makePlainText: makePlainText,
    makeCSV: makeCSV,
    makeRTF: makeRTF
  };
})();