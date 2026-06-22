(function () {
  "use strict";

  window.CIFLord = window.CIFLord || {};

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
  
  var toastTimer = null;

  function showToast(message, type) {
    var toast = $("toast");
  
    if (!toast) {
      return;
    }
  
    toast.textContent = message;
  
    toast.classList.remove("warning", "error");
  
    if (type === "warning") {
      toast.classList.add("warning");
    }
  
    if (type === "error") {
      toast.classList.add("error");
    }
  
    toast.classList.add("show");
  
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
  
    toastTimer = setTimeout(function () {
      toast.classList.remove("show", "warning", "error");
    }, 2400);
  }
  
  function hasLoadedCif(state) {
    return !!(state && state.hasLoadedCif);
  }

  function selectionTabIsActive() {
    var tab = document.querySelector(".tab[data-tab='selection']");
    return !!(tab && tab.classList.contains("active"));
  }

  function updateActionButtons(state) {
    var enabled = hasLoadedCif(state);
    var previewCopyEnabled = enabled && selectionTabIsActive();
  
    [
      "btn-copy-md",
      "btn-copy-text",
      "btn-download-rtf",
      "btn-download-md",
      "btn-download-text",
      "btn-download-csv"
    ].forEach(function (id) {
      var button = $(id);
  
      if (button) {
        button.disabled = !enabled;
      }
    });
  
    var formatted = $("btn-copy-formatted");
  
    if (formatted) {
      formatted.disabled = !previewCopyEnabled;
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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

  function filterItems(items, filter) {
    return items.filter(function (item) {
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

  function collectElements(state) {
    var elements = [];

    if (state.elements && state.elements.length) {
      elements = state.elements.slice();
    } else {
      state.bonds.concat(state.angles).concat(state.addedDistances).forEach(function (item) {
        itemAtomLabels(item).forEach(function (label) {
          var el = atomElement(label);
          if (el && elements.indexOf(el) === -1) {
            elements.push(el);
          }
        });
      });

      elements.sort();
    }

    if (!elements.length) {
      return ["all"];
    }

    return ["all"].concat(elements);
  }

  function collectAtomsForElement(state, element) {
    var atoms = [];

    if (state.atoms && state.atoms.length) {
      state.atoms.forEach(function (atom) {
        if (element === "all" || atom.element === element) {
          if (atoms.indexOf(atom.label) === -1) {
            atoms.push(atom.label);
          }
        }
      });
    } else {
      state.bonds.concat(state.angles).concat(state.addedDistances).forEach(function (item) {
        itemAtomLabels(item).forEach(function (label) {
          if (element === "all" || atomElement(label) === element) {
            if (atoms.indexOf(label) === -1) {
              atoms.push(label);
            }
          }
        });
      });
    }

    atoms.sort();

    if (!atoms.length) {
      return ["all"];
    }

    return ["all"].concat(atoms);
  }

  function setSelectOptions(selectId, values, preferredValue) {
    var select = $(selectId);
    if (!select) return "";

    values = values || [];

    var current = preferredValue || select.value || "";

    if (values.indexOf(current) === -1) {
      current = values[0] || "";
    }

    select.innerHTML = values.map(function (value) {
      return "<option value=\"" + escapeHtml(value) + "\">" + escapeHtml(value) + "</option>";
    }).join("");

    select.value = current;
    return current;
  }

  function updateSelectionControls(state) {
    state.selectionFilter = state.selectionFilter || { element: "all", atom: "all" };
    state.averageFilter = state.averageFilter || { element: "all", atom: "all" };

    var elements = collectElements(state);

    var selectedElement = setSelectOptions(
      "select-element",
      elements,
      state.selectionFilter.element
    );

    var selectedAtom = setSelectOptions(
      "select-atom",
      collectAtomsForElement(state, selectedElement),
      state.selectionFilter.atom
    );

    state.selectionFilter.element = selectedElement || "all";
    state.selectionFilter.atom = selectedAtom || "all";

    var avgElement = setSelectOptions(
      "avg-select-element",
      elements,
      state.averageFilter.element
    );

    var avgAtom = setSelectOptions(
      "avg-select-atom",
      collectAtomsForElement(state, avgElement),
      state.averageFilter.atom
    );

    state.averageFilter.element = avgElement || "all";
    state.averageFilter.atom = avgAtom || "all";

    updateInteratomicControls(state);
  }

  function updateInteratomicControls(state) {
    var symOps = state.symmetryOps || [];
    var elementValues = [];

    if (state.elements && state.elements.length) {
      elementValues = state.elements.slice();
    }

    setSelectOptions(
      "single-element-a",
      elementValues,
      $("single-element-a") ? $("single-element-a").value : ""
    );

    setSelectOptions(
      "single-element-b",
      elementValues,
      $("single-element-b") ? $("single-element-b").value : ""
    );

    var elementA = $("single-element-a") ? $("single-element-a").value : "";
    var elementB = $("single-element-b") ? $("single-element-b").value : "";

    var atomsA = collectAtomsForElement(state, elementA).filter(function (a) {
      return a !== "all";
    });

    var atomsB = collectAtomsForElement(state, elementB).filter(function (a) {
      return a !== "all";
    });

    setSelectOptions(
      "single-atom-a",
      atomsA,
      $("single-atom-a") ? $("single-atom-a").value : ""
    );

    setSelectOptions(
      "single-atom-b",
      atomsB,
      $("single-atom-b") ? $("single-atom-b").value : ""
    );

    setSelectOptions(
      "search-element-a",
      elementValues,
      $("search-element-a") ? $("search-element-a").value : ""
    );

    setSelectOptions(
      "search-element-b",
      elementValues,
      $("search-element-b") ? $("search-element-b").value : ""
    );

    var searchElementA = $("search-element-a") ? $("search-element-a").value : "";
    var searchElementB = $("search-element-b") ? $("search-element-b").value : "";

    var searchAtomsA = collectAtomsForElement(state, searchElementA);
    var searchAtomsB = collectAtomsForElement(state, searchElementB);

    setSelectOptions(
      "search-atom-a",
      searchAtomsA,
      $("search-atom-a") ? $("search-atom-a").value : "all"
    );

    setSelectOptions(
      "search-atom-b",
      searchAtomsB,
      $("search-atom-b") ? $("search-atom-b").value : "all"
    );

    var symSelect = $("single-symop");

    if (symSelect) {
      var old = symSelect.value || "";

      var symValues = symOps.map(function (op) {
        return String(op.id);
      });

      if (symValues.indexOf(old) === -1) {
        old = symValues[0] || "";
      }

      symSelect.innerHTML = symOps.map(function (op) {
        return "<option value=\"" + escapeHtml(op.id) + "\">" +
          escapeHtml(op.id + ": " + op.operation) +
          "</option>";
      }).join("");

      symSelect.value = old;
    }

    var searchMin = $("search-min");
    var searchMax = $("search-max");

    if (searchMin && searchMin.value === "") {
      searchMin.value = "1";
    }

    if (searchMax && searchMax.value === "") {
      searchMax.value = "4";
    }
  }

  function bindTabs(onChange) {
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        var name = tab.getAttribute("data-tab");
  
        document.querySelectorAll(".tab").forEach(function (t) {
          t.classList.toggle("active", t === tab);
        });
  
        document.querySelectorAll(".tab-page").forEach(function (page) {
          page.classList.toggle("active", page.id === "tab-" + name);
        });
  
        if (typeof onChange === "function") {
          onChange(name);
        }
      });
    });
  }

  function renderMeta(state) {
    setText("meta-file", state.fileName || "—");
    setText("meta-data-name", state.dataName || "—");
    setText("meta-status", state.status || "No CIF loaded");
    setText("meta-atoms", state.atoms && state.atoms.length ? state.atoms.length : "—");
    setText("meta-symops", state.symmetryOps && state.symmetryOps.length ? state.symmetryOps.length : "—");

    setHTML("warnings-list", state.warnings.map(function (w) {
      return "<li>" + escapeHtml(w) + "</li>";
    }).join(""));
  }

  function getSortOptions(state) {
    state.sortOptions = state.sortOptions || {
      bonds: "cif",
      angles: "cif"
    };

    return state.sortOptions;
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

  function nextSortMode(currentMode, clickedKey) {
    if (clickedKey === "atoms") {
      if (currentMode === "atoms-asc") return "atoms-desc";
      if (currentMode === "atoms-desc") return "cif";
      return "atoms-asc";
    }

    if (clickedKey === "value") {
      if (currentMode === "value-asc") return "value-desc";
      if (currentMode === "value-desc") return "cif";
      return "value-asc";
    }

    return "cif";
  }

  function sortIndicator(currentMode, key) {
    if (key === "atoms") {
      if (currentMode === "atoms-asc") return " ↑";
      if (currentMode === "atoms-desc") return " ↓";
      return " ↕";
    }

    if (key === "value") {
      if (currentMode === "value-asc") return " ↑";
      if (currentMode === "value-desc") return " ↓";
      return " ↕";
    }

    return "";
  }

  function makeSortableValueTable(listName, items, valueHeader, sortMode) {
    if (!items.length) {
      return "<p class=\"hint\">No entries for current selection.</p>";
    }

    var rows = items.map(function (item) {
      return (
        "<tr>" +
          "<td>" + item.atomsHtml + "</td>" +
          "<td class=\"number\">" + item.value + "</td>" +
        "</tr>"
      );
    }).join("");

    return (
      "<table class=\"data-table\">" +
        "<thead><tr>" +
          "<th class=\"sortable\" data-sort-list=\"" + listName + "\" data-sort-key=\"atoms\">" +
            "Atoms" + sortIndicator(sortMode, "atoms") +
          "</th>" +
          "<th class=\"sortable number\" data-sort-list=\"" + listName + "\" data-sort-key=\"value\">" +
            valueHeader + sortIndicator(sortMode, "value") +
          "</th>" +
        "</tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>"
    );
  }

  function makeSimpleTable(items, valueHeader) {
    if (!items.length) {
      return "<p class=\"hint\">No entries for current selection.</p>";
    }

    var rows = items.map(function (item) {
      return (
        "<tr>" +
          "<td>" + item.atomsHtml + "</td>" +
          "<td class=\"number\">" + item.value + "</td>" +
        "</tr>"
      );
    }).join("");

    return (
      "<table class=\"data-table\">" +
        "<thead><tr>" +
          "<th>Atoms</th>" +
          "<th>" + valueHeader + "</th>" +
        "</tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>"
    );
  }

  function makeAddedDistancesManagerTable(items) {
    if (!items.length) {
      return "<p class=\"hint\">No added interatomic distances.</p>";
    }

    var rows = items.map(function (item) {
      return (
        "<tr>" +
          "<td><input type=\"checkbox\" data-action=\"added-active\" data-id=\"" + item.id + "\"" + (item.report ? " checked" : "") + "></td>" +
          "<td>" + item.atomsHtml + "</td>" +
          "<td class=\"number\">" + item.value + "</td>" +
          "<td>" + (item.operation ? formatSymmetryOperationHtml(item.operation) : "") + "</td>" +
          "<td><button type=\"button\" data-action=\"remove-added\" data-id=\"" + item.id + "\">Remove</button></td>" +
        "</tr>"
      );
    }).join("");

    return (
      "<table class=\"data-table\">" +
        "<thead><tr>" +
          "<th>Add</th>" +
          "<th>Atoms</th>" +
          "<th>Distance / A</th>" +
          "<th>Symmetry operation</th>" +
          "<th>Remove</th>" +
        "</tr></thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>"
    );
  }

  function formatSymmetrySymbolHtml(symbol) {
    if (!symbol) {
      return "";
    }

    if (symbol === "'" || symbol === "''" || symbol === "'''") {
      return symbol;
    }

    return "<sup>" + symbol + "</sup>";
  }

  function formatSymmetrySymbolText(symbol) {
    return String(symbol || "");
  }

  function formatSymmetryOperationHtml(operation) {
    return escapeHtml(operation || "").replace(/([xyz])/g, "<i>$1</i>");
  }

  function makeSymmetryBlock(state, items) {
    var notes = CIFLord.Core.usedSymmetryNotes(state, items);

    if (!notes.length) return "";

    var label = notes.length === 1
      ? "Symmetry transformation used to generate equivalent atoms:"
      : "Symmetry transformations used to generate equivalent atoms:";

    return (
      "<p class=\"symmetry-note\"><strong>" + label + "</strong> " +
      notes.map(function (n) {
        return "(" + escapeHtml(formatSymmetrySymbolText(n.symbol)) + ") " + formatSymmetryOperationHtml(n.operation);
      }).join("; ") +
      ".</p>"
    );
  }

  function renderSelectionTables(state) {
    var filter = state.selectionFilter || { element: "all", atom: "all" };
    var sortOptions = getSortOptions(state);

    var bonds = filterItems(state.bonds, filter);
    var angles = filterItems(state.angles, filter);
    var added = filterItems(state.addedDistances.filter(function (item) {
      return item.report;
    }), filter);

    bonds = applyIndependentOnly(bonds, state);
    angles = applyIndependentOnly(angles, state);
    angles = applyMiddleAtomOnlyToAngles(angles, state, filter);

    bonds = sortItems(bonds, sortOptions.bonds);
    angles = sortItems(angles, sortOptions.angles);

    var html = "";

    html += "<h3>Selected bond lengths from CIF</h3>";
    html += makeSortableValueTable("bonds", bonds, "Distance / A", sortOptions.bonds);

    html += "<h3>Selected bond angles from CIF</h3>";
    html += makeSortableValueTable("angles", angles, "Angle / deg", sortOptions.angles);

    html += "<h3>Added interatomic distances</h3>";
    html += makeSimpleTable(added, "Distance / A");

    html += makeSymmetryBlock(state, bonds.concat(angles).concat(added));

    setHTML("selection-tables", html);
  }

  function median(values) {
    if (!values.length) return null;

    var sorted = values.slice().sort(function (a, b) {
      return a - b;
    });

    var mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2) {
      return sorted[mid];
    }

    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function sampleStdDev(values, mean) {
    if (values.length < 2) return null;

    var sum = values.reduce(function (acc, v) {
      return acc + Math.pow(v - mean, 2);
    }, 0);

    return Math.sqrt(sum / (values.length - 1));
  }

  function populationStdDev(values, mean) {
    if (!values.length) return null;

    var sum = values.reduce(function (acc, v) {
      return acc + Math.pow(v - mean, 2);
    }, 0);

    return Math.sqrt(sum / values.length);
  }

  function standardErrorFromScatter(values, sampleStd) {
    if (values.length < 2 || sampleStd === null || sampleStd === undefined) {
      return null;
    }

    return sampleStd / Math.sqrt(values.length);
  }

  function mean(values) {
    if (!values.length) return null;

    return values.reduce(function (acc, v) {
      return acc + v;
    }, 0) / values.length;
  }

  function valueList(items) {
    return items
      .map(function (item) {
        return item.numericalValue;
      })
      .filter(function (v) {
        return typeof v === "number" && isFinite(v);
      });
  }

  function formatStat(value, digits) {
    if (value === null || value === undefined || !isFinite(value)) {
      return "-";
    }

    return Number(value).toFixed(digits);
  }

  function cleanAtomLabel(label) {
    return String(label || "")
      .replace(/\^[A-Za-zIVXLCDM]+/g, "")
      .replace(/'{1,3}$/g, "");
  }

  function splitItemAtoms(item) {
    var text = String(item.atomsText || "");

    text = text.replace(/\^[A-Za-zIVXLCDM]+/g, "");
    text = text.replace(/'{1,3}(?=\.{3}|-|$)/g, "");

    return text.split(/\.{3}|-/).filter(Boolean).map(cleanAtomLabel);
  }

  function elementOf(label) {
    var m = String(label || "").match(/^([A-Z][a-z]?)/);
    return m ? m[1] : "";
  }

  function groupKeyForDistance(item) {
    var atoms = splitItemAtoms(item);
    var e1 = elementOf(atoms[0]);
    var e2 = elementOf(atoms[1]);

    var connector = item.kind === "distance" || item.source === "calculated"
      ? "···"
      : "–";

    return e1 + connector + e2;
  }

  function groupKeyForAngle(item) {
    var atoms = splitItemAtoms(item);
    var e1 = elementOf(atoms[0]);
    var e2 = elementOf(atoms[1]);
    var e3 = elementOf(atoms[2]);

    return e1 + "–" + e2 + "–" + e3;
  }

  function groupItems(items, keyFn) {
    var groups = {};

    items.forEach(function (item) {
      var key = keyFn(item);

      if (!key || key.indexOf("undefined") !== -1) {
        return;
      }

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(item);
    });

    return groups;
  }

  function makeGroupedStatsRows(groups, digits) {
    return Object.keys(groups).sort().map(function (key) {
      var items = groups[key];
      var values = valueList(items);
      var n = values.length;
      var avg = mean(values);
      var sStd = sampleStdDev(values, avg);

      var sortedItems = items.slice().sort(function (a, b) {
        return a.numericalValue - b.numericalValue;
      });

      var range = "-";

      if (sortedItems.length === 1) {
        range = sortedItems[0].value;
      } else if (sortedItems.length === 2) {
        range = sortedItems[0].value + " / " + sortedItems[1].value;
      } else if (sortedItems.length > 2) {
        range = sortedItems[0].value + " - " + sortedItems[sortedItems.length - 1].value;
      }

      return {
        key: key,
        count: n,
        mean: formatStat(avg, digits),
        range: range,
        sampleStdDev: formatStat(sStd, digits)
      };
    });
  }

  function makeGroupedStatsTable(unit, groups, digits) {
    var rows = makeGroupedStatsRows(groups, digits);

    if (!rows.length) {
      return "<p class=\"hint\">No values for current average selection.</p>";
    }

    var htmlRows = rows.map(function (row) {
      return (
        "<tr>" +
          "<td>" + escapeHtml(row.key) + "</td>" +
          "<td class=\"number\">" + row.count + "</td>" +
          "<td class=\"number\">" + row.mean + "</td>" +
          "<td class=\"number\">" + escapeHtml(row.range) + "</td>" +
          "<td class=\"number\">" + row.sampleStdDev + "</td>" +
        "</tr>"
      );
    }).join("");

    return (
      "<table class=\"data-table\">" +
        "<thead>" +
          "<tr>" +
            "<th>Atoms</th>" +
            "<th>Count</th>" +
            "<th>Mean /" + unit + "</th>" +
            "<th>Range /" + unit + "</th>" +
            "<th>Sam. std. dev.</th>" +
          "</tr>" +
        "</thead>" +
        "<tbody>" + htmlRows + "</tbody>" +
      "</table>"
    );
  }

  function averageSelectionLabel(filter) {
    filter = filter || { element: "all", atom: "all" };

    if (filter.atom && filter.atom !== "all") {
      return filter.atom;
    }

    if (filter.element && filter.element !== "all") {
      return "all " + filter.element;
    }

    return "all atoms";
  }

  function renderAverage(state) {
    var filter = state.averageFilter || { element: "all", atom: "all" };
    var label = averageSelectionLabel(filter);

    setText("average-bonds-title", "Average bond lengths / distances for " + label);
    setText("average-angles-title", "Average bond angles for " + label);

    var activeAdded = state.addedDistances.filter(function (item) {
      return item.report;
    });

    var distanceItems = filterItems(state.bonds.concat(activeAdded), filter);
    var angleItems = filterItems(state.angles, filter);

    angleItems = applyMiddleAtomOnlyToAngles(angleItems, state, filter);

    var distanceGroups = groupItems(distanceItems, groupKeyForDistance);
    var angleGroups = groupItems(angleItems, groupKeyForAngle);

    setHTML(
      "average-bonds",
      makeGroupedStatsTable("Å", distanceGroups, 4) +
      "<p class=\"hint\">Added interatomic distances are included if they are checked in the Interatomic Distances tab.</p>" +
      "<p class=\"hint\">Sample standard deviation describes the scatter of grouped values; individual crystallographic e.s.d.s are not propagated.</p>"
    );

    setHTML(
      "average-angles",
      makeGroupedStatsTable("°", angleGroups, 2) +
      "<p class=\"hint\">Angles are grouped by element pattern, e.g. N–Fe–N.</p>" +
      "<p class=\"hint\">Sample standard deviation describes the scatter of grouped values; individual crystallographic e.s.d.s are not propagated.</p>"
    );
  }

  function renderSingleDistance(state) {
    var atomA = $("single-atom-a") ? $("single-atom-a").value : "";
    var atomB = $("single-atom-b") ? $("single-atom-b").value : "";
    var symOpId = $("single-symop") ? $("single-symop").value : "";
    var cx = $("single-code-x") ? $("single-code-x").value : "5";
    var cy = $("single-code-y") ? $("single-code-y").value : "5";
    var cz = $("single-code-z") ? $("single-code-z").value : "5";

    var res = null;

    if (atomA && atomB && symOpId) {
      res = CIFLord.Core.calculateInteratomicDistance(state, {
        atomA: atomA,
        atomB: atomB,
        symOpId: symOpId,
        code: cx + cy + cz
      });
    }

    state.lastSingleDistance = res;

    if (!res) {
      setHTML("single-result-operation", "—");
      setText("single-result-distance", "not available");
      return;
    }

    setHTML(
      "single-result-operation",
      isIdentitySymmetryOperation(res.operation) ? "—" : formatSymmetryOperationHtml(res.operation)
    );

    setText("single-result-distance", res.value + " A");
  }

  function renderInteratomic(state) {
    renderSingleDistance(state);

    setHTML(
      "added-distances-table",
      makeAddedDistancesManagerTable(state.addedDistances)
    );
  }

  function renderPreview(state) {
    setHTML("report-preview", CIFLord.Reports.renderHTMLPreview(state));
  }

  function roman(n) {
    if (n === 1) return "'";
    if (n === 2) return "''";
    if (n === 3) return "'''";

    var value = n;
    var table = [
      [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
      [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
      [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
    ];

    var out = "";

    table.forEach(function (entry) {
      while (value >= entry[0]) {
        out += entry[1];
        value -= entry[0];
      }
    });

    return out;
  }

  function isIdentitySymmetryOperation(operation) {
    var normalized = String(operation || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/\+0/g, "")
      .replace(/-0/g, "");

    return normalized === "x,y,z";
  }

  function ensureSymmetryNoteForOperation(state, operation) {
    operation = String(operation || "").trim();

    if (!operation || isIdentitySymmetryOperation(operation)) {
      return "";
    }

    var existing = state.symmetryNotes.find(function (note) {
      return String(note.operation || "").trim() === operation;
    });

    if (existing) {
      return existing.symbol;
    }

    var symbol = roman(state.symmetryNotes.length + 1);

    state.symmetryNotes.push({
      symbol: symbol,
      code: "added_" + symbol,
      operation: operation
    });

    return symbol;
  }

  function formatSymmetrySymbolText(symbol) {
    if (!symbol) {
      return "";
    }

    if (symbol === "'" || symbol === "''" || symbol === "'''") {
      return symbol;
    }

    return "^" + symbol;
  }

  function makeAddedDistanceFromResult(state, result) {
    var operation = String(result.operation || "").trim();
    var hasNonIdentityOperation = operation && !isIdentitySymmetryOperation(operation);

    var symbol = hasNonIdentityOperation
      ? ensureSymmetryNoteForOperation(state, operation)
      : "";

    var htmlSymbol = formatSymmetrySymbolHtml(symbol);
    var textSymbol = formatSymmetrySymbolText(symbol);

    return {
      id: "d" + Date.now() + "_" + Math.random().toString(16).slice(2),
      source: "calculated",
      kind: "distance",
      atomsHtml:
        escapeHtml(result.atomA) +
        "&middot;&middot;&middot;" +
        escapeHtml(result.atomB) +
        htmlSymbol,
      atomsText:
        result.atomA +
        "..." +
        result.atomB +
        textSymbol,
      value: result.value,
      numericalValue: result.distance,
      esd: result.esd,
      report: true,
      average: true,
      symRefs: symbol ? [symbol] : [],
      operation: hasNonIdentityOperation ? operation : ""
    };
  }

  function makeAtomSelector(element, atom) {
    element = String(element || "");
    atom = String(atom || "");

    if (!element) {
      return "";
    }

    if (atom && atom !== "all") {
      return atom;
    }

    return "all " + element;
  }

  function bindDynamicTableEvents(state, renderAll) {
    document.body.addEventListener("change", function (event) {
      var el = event.target;

      if (!el.matches("input[type='checkbox'][data-action]")) {
        return;
      }

      var action = el.getAttribute("data-action");
      var listName = el.getAttribute("data-list");
      var id = el.getAttribute("data-id");

      if (action === "added-active") {
        var addedItem = state.addedDistances.find(function (item) {
          return item.id === id;
        });

        if (addedItem) {
          addedItem.report = el.checked;
          addedItem.average = el.checked;
          renderAll();
        }

        return;
      }

      var list;

      if (listName === "lengths") {
        list = state.bonds.concat(state.addedDistances);
      } else {
        list = state[listName];
      }

      if (!list) return;

      var item = list.find(function (x) {
        return x.id === id;
      });

      if (!item) return;

      if (action === "report") {
        item.report = el.checked;
      }

      if (action === "average") {
        item.average = el.checked;
      }

      renderAll();
    });

    document.body.addEventListener("click", function (event) {
      var el = event.target;

      if (el.matches("button[data-action='remove-added']")) {
        var id = el.getAttribute("data-id");

        state.addedDistances = state.addedDistances.filter(function (item) {
          return item.id !== id;
        });

        renderAll();
        return;
      }

      if (el.matches("th.sortable")) {
        var listName = el.getAttribute("data-sort-list");
        var sortKey = el.getAttribute("data-sort-key");

        state.sortOptions = state.sortOptions || {
          bonds: "cif",
          angles: "cif"
        };

        if (listName === "bonds") {
          state.sortOptions.bonds = nextSortMode(state.sortOptions.bonds, sortKey);
        }

        if (listName === "angles") {
          state.sortOptions.angles = nextSortMode(state.sortOptions.angles, sortKey);
        }

        renderAll();
      }
    });
  }

  function bindSelectionControls(state, renderAll) {
    $("select-element").addEventListener("change", function () {
      state.selectionFilter = state.selectionFilter || {};
      state.selectionFilter.element = this.value;
      state.selectionFilter.atom = "all";
      renderAll();
    });

    $("select-atom").addEventListener("change", function () {
      state.selectionFilter = state.selectionFilter || {};
      state.selectionFilter.atom = this.value;
      renderAll();
    });

    $("avg-select-element").addEventListener("change", function () {
      state.averageFilter = state.averageFilter || {};
      state.averageFilter.element = this.value;
      state.averageFilter.atom = "all";
      renderAll();
    });

    $("avg-select-atom").addEventListener("change", function () {
      state.averageFilter = state.averageFilter || {};
      state.averageFilter.atom = this.value;
      renderAll();
    });
  }

  function bindInteratomicControlChanges(renderAll) {
    [
      "single-element-a",
      "single-element-b",
      "single-atom-a",
      "single-atom-b",
      "single-symop",
      "single-code-x",
      "single-code-y",
      "single-code-z",

      "search-element-a",
      "search-atom-a",
      "search-element-b",
      "search-atom-b"
    ].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener("change", renderAll);
      }
    });
  }

  function bindOptions(state, renderAll) {
    $("opt-show-bonds").addEventListener("change", function () {
      state.reportOptions.showBonds = this.checked;
      renderAll();
    });

    $("opt-show-angles").addEventListener("change", function () {
      state.reportOptions.showAngles = this.checked;
      renderAll();
    });

    var middleAtomOnly = $("opt-middle-atom-only");

    if (middleAtomOnly) {
      middleAtomOnly.checked = !!state.reportOptions.middleAtomOnly;

      middleAtomOnly.addEventListener("change", function () {
        state.reportOptions.middleAtomOnly = this.checked;
        renderAll();
      });
    }

    $("opt-show-caption").addEventListener("change", function () {
      state.reportOptions.showCaption = this.checked;
      renderAll();
    });

    $("opt-si-units").addEventListener("change", function () {
      state.reportOptions.siUnits = this.checked;
      renderAll();
    });

    $("opt-added-display").addEventListener("change", function () {
      state.reportOptions.addedDisplay = this.value;
      renderAll();
    });
  }

  function bindIndependentOption(state, renderAll) {
    var checkbox = $("opt-independent");

    if (!checkbox) {
      return;
    }

    state.selectionOptions = state.selectionOptions || {
      independentOnly: false
    };

    checkbox.checked = !!state.selectionOptions.independentOnly;

    checkbox.addEventListener("change", function () {
      state.selectionOptions.independentOnly = this.checked;
      renderAll();
    });
  }

  function bindInteratomicButtons(state, renderAll) {
    $("btn-search-distances").addEventListener("click", function () {
      var progress = $("search-progress");
      if (progress) progress.value = 0;

      var searchElementA = $("search-element-a") ? $("search-element-a").value : "";
      var searchAtomA = $("search-atom-a") ? $("search-atom-a").value : "all";

      var searchElementB = $("search-element-b") ? $("search-element-b").value : "";
      var searchAtomB = $("search-atom-b") ? $("search-atom-b").value : "all";

      var origin = makeAtomSelector(searchElementA, searchAtomA);
      var target = makeAtomSelector(searchElementB, searchAtomB);

      var min = $("search-min") ? $("search-min").value : "";
      var max = $("search-max") ? $("search-max").value : "";

      if (!origin || !target) {
        renderAll();
        return;
      }

      var results = CIFLord.Core.searchInteratomicDistances(state, {
        origin: origin,
        target: target,
        min: min,
        max: max
      });

      results.forEach(function (res) {
        state.addedDistances.push(makeAddedDistanceFromResult(state, res));
      });

      if (progress) progress.value = 100;

      renderAll();

      showToast(
        "Added " +
        results.length +
        " distance" +
        (results.length === 1 ? "" : "s")
      );
    });

    $("btn-clear-added-distances").addEventListener("click", function () {
      state.addedDistances = [];
      renderAll();
      showToast("Cleared added distances");
    });

    $("btn-add-single-distance").addEventListener("click", function () {
      if (state.lastSingleDistance) {
        state.addedDistances.push(makeAddedDistanceFromResult(state, state.lastSingleDistance));
        renderAll();
        showToast("Added interatomic distance");
      }
    });
  }

  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");

    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);

    showToast("Saved " + filename);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    var textarea = document.createElement("textarea");

    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(textarea);
    }

    return Promise.resolve();
  }

  function bindExportButtons(state) {
    function baseName() {
      return state.dataName || "ciflord-report";
    }

    function md() {
      return CIFLord.Reports.makeMarkdown(state);
    }

    function txt() {
      return CIFLord.Reports.makePlainText(state);
    }

    function csv() {
      return CIFLord.Reports.makeCSV(state);
    }

    function rtf() {
      return CIFLord.Reports.makeRTF(state);
    }

    function bindClick(id, handler) {
      var button = $(id);

      if (!button) {
        return;
      }

      button.addEventListener("click", handler);
    }

    function requireCifLoaded() {
      if (!hasLoadedCif(state)) {
        showToast("Load a CIF first");
        return false;
      }

      return true;
    }

    bindClick("btn-download-md", function () {
      if (!requireCifLoaded()) return;
      download(baseName() + ".md", md(), "text/markdown;charset=utf-8");
    });

    bindClick("btn-download-text", function () {
      if (!requireCifLoaded()) return;
      download(baseName() + ".txt", txt(), "text/plain;charset=utf-8");
    });

    bindClick("btn-download-rtf", function () {
      if (!requireCifLoaded()) return;
      download(baseName() + ".rtf", rtf(), "application/rtf");
    });

    bindClick("btn-download-csv", function () {
      if (!requireCifLoaded()) return;
      download(baseName() + ".csv", csv(), "text/csv;charset=utf-8");
    });

    bindClick("btn-copy-md", function () {
      if (!requireCifLoaded()) return;

      copyText(md()).then(function () {
        showToast("Copied Markdown to clipboard");
      });
    });

    bindClick("btn-copy-text", function () {
      if (!requireCifLoaded()) return;

      copyText(txt()).then(function () {
        showToast("Copied plain text to clipboard");
      });
    });

    bindClick("btn-copy-formatted", function () {
      if (!requireCifLoaded()) return;
    
      var selectionTab = document.querySelector(".tab[data-tab='selection']");
    
      if (selectionTab && !selectionTab.classList.contains("active")) {
        showToast("Open Selection & Preview to copy the formatted report", "warning");
        return;
      }
    
      var preview = $("report-preview");
    
      if (!preview) {
        showToast("Report preview not available");
        return;
      }
    
      var range = document.createRange();
      var selection = window.getSelection();
    
      selection.removeAllRanges();
      range.selectNodeContents(preview);
      selection.addRange(range);
    
      try {
        var ok = document.execCommand("copy");
    
        if (ok) {
          showToast("Copied report preview to clipboard");
        } else {
          showToast("Formatted copy failed", "error");
        }
      } catch (e) {
        alert("Formatted copy failed. Please select the preview manually and press Ctrl+C.");
      }
    
      selection.removeAllRanges();
    });
  }

  function bindFileLoading(state, renderAll) {
    var fileInput = $("file-input");

    function openFileDialog() {
      fileInput.click();
    }

    $("btn-load-proxy").addEventListener("click", openFileDialog);
    $("btn-file-select").addEventListener("click", openFileDialog);

    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files[0]) {
        readFile(fileInput.files[0], state, renderAll);
      }
    });

    var dz = $("dropzone");

    dz.addEventListener("dragover", function (e) {
      e.preventDefault();
      dz.classList.add("dragover");
    });

    dz.addEventListener("dragleave", function () {
      dz.classList.remove("dragover");
    });

    dz.addEventListener("drop", function (e) {
      e.preventDefault();
      dz.classList.remove("dragover");

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        readFile(e.dataTransfer.files[0], state, renderAll);
      }
    });
  }

  function readFile(file, state, renderAll) {
    var reader = new FileReader();

    reader.onload = function () {
      var parsed = CIFLord.Parser.parse(String(reader.result || ""));

      CIFLord.Core.updateStateFromParsedCIF(state, parsed, file.name);

      state.selectionFilter = { element: "all", atom: "all" };
      state.averageFilter = { element: "all", atom: "all" };
      state.sortOptions = { bonds: "cif", angles: "cif" };
      state.selectionOptions = { independentOnly: false };

      if (!state.reportOptions) {
        state.reportOptions = {};
      }

      if (typeof state.reportOptions.middleAtomOnly !== "boolean") {
        state.reportOptions.middleAtomOnly = false;
      }

      renderAll();
      showToast("Loaded " + file.name);
    };

    reader.readAsText(file);
  }

  CIFLord.UI = {
    init: function (state) {
      state.selectionFilter = { element: "all", atom: "all" };
      state.averageFilter = { element: "all", atom: "all" };
      state.sortOptions = state.sortOptions || { bonds: "cif", angles: "cif" };
      state.selectionOptions = state.selectionOptions || { independentOnly: false };

      state.reportOptions = state.reportOptions || {};
      state.reportOptions.middleAtomOnly = !!state.reportOptions.middleAtomOnly;

      bindTabs(function () {
        updateActionButtons(state);
      });

      var renderAll = function () {
        updateSelectionControls(state);
        renderMeta(state);
        renderSelectionTables(state);
        renderAverage(state);
      
        if (CIFLord.GeometryParameters) {
          CIFLord.GeometryParameters.render(state);
        }
      
        renderInteratomic(state);
        renderPreview(state);
        updateActionButtons(state);
      };

      bindDynamicTableEvents(state, renderAll);
      bindSelectionControls(state, renderAll);
      bindIndependentOption(state, renderAll);
      bindInteratomicControlChanges(renderAll);
      bindOptions(state, renderAll);
      bindInteratomicButtons(state, renderAll);
      bindExportButtons(state);
      bindFileLoading(state, renderAll);
      
      if (CIFLord.GeometryParameters) {
        CIFLord.GeometryParameters.init(state, renderAll);
      }
      
      renderAll();
    }
  };
})();