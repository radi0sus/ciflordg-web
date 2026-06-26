(function () {
  "use strict";

  window.CIFLord = window.CIFLord || {};

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setText(id, text, cls) {
    var el = $(id);

    if (!el) {
      return;
    }

    el.textContent = text;
    el.className = cls || "hint";
  }

  function symmetrySymbolHtml(symbol) {
    if (!symbol) {
      return "";
    }

    if (symbol === "'" || symbol === "''" || symbol === "'''") {
      return escapeHtml(symbol);
    }

    return "<sup>" + escapeHtml(symbol) + "</sup>";
  }

  function atomLabelHtml(atom) {
    if (!atom || !atom.symmetrySymbol) {
      return escapeHtml(atom ? atom.label : "");
    }

    return escapeHtml(atom.label) + symmetrySymbolHtml(atom.symmetrySymbol);
  }

  function ensureState(state) {
    state.ortep = state.ortep || {};

    var ortep = state.ortep;

    if (!ortep.options) {
      ortep.options = {};
    }

    if (!ortep.displayOptions) {
      ortep.displayOptions = {};
    }

    if (!ortep.displayOptions.atomOverrides) {
      ortep.displayOptions.atomOverrides = {};
    }

    if (!ortep.displayOptions.bondOverrides) {
      ortep.displayOptions.bondOverrides = {};
    }

    if (!ortep.components) {
      ortep.components = [];
    }

    if (typeof ortep.initialized !== "boolean") {
      ortep.initialized = false;
    }

    if (typeof ortep.options.probability !== "number") {
      ortep.options.probability = 50;
    }

    if (typeof ortep.options.styleScale !== "number") {
      ortep.options.styleScale = 1;
    }

    if (typeof ortep.options.fixedDrawingScale !== "boolean") {
      ortep.options.fixedDrawingScale = false;
    }

    if (typeof ortep.options.projectionScale !== "number") {
      ortep.options.projectionScale = 80;
    }

    if (typeof ortep.options.labelFontSize !== "number") {
      ortep.options.labelFontSize = 14;
    }

    if (typeof ortep.options.maxAtoms !== "number") {
      ortep.options.maxAtoms = 200;
    }

    if (typeof ortep.options.maxRadius !== "number") {
      ortep.options.maxRadius = 20;
    }

    if (typeof ortep.options.maxDepth !== "number") {
      ortep.options.maxDepth = 14;
    }

    if (typeof ortep.options.showLabels !== "boolean") {
      ortep.options.showLabels = true;
    }

    if (typeof ortep.options.labelCarbon !== "boolean") {
      ortep.options.labelCarbon = false;
    }

    if (typeof ortep.options.labelHydrogen !== "boolean") {
      ortep.options.labelHydrogen = false;
    }

    if (typeof ortep.options.showBackfaces !== "boolean") {
      ortep.options.showBackfaces = false;
    }

    if (typeof ortep.options.twoColoredBonds !== "boolean") {
      ortep.options.twoColoredBonds = true;
    }

    if (typeof ortep.options.bondShadows !== "boolean") {
      ortep.options.bondShadows = true;
    }

    if (typeof ortep.options.showHydrogen !== "boolean") {
      ortep.options.showHydrogen = false;
    }

    if (typeof ortep.options.addMissingHydrogenAtoms !== "boolean") {
      ortep.options.addMissingHydrogenAtoms = true;
    }

    return ortep;
  }

  function reset(state) {
    state.ortep = {
      initialized: false,

      model: null,
      components: [],
      fragment: null,
      viewState: null,

      liveSvg: "",
      lastFitScale: null,

      sourceFilename: state.fileName || "",

      options: {
        componentId: "",
        probability: 50,

        styleScale: 1,
        fixedDrawingScale: false,
        projectionScale: 80,
        labelFontSize: 14,

        maxAtoms: 200,
        maxRadius: 20,
        maxDepth: 14,

        showLabels: true,
        labelCarbon: false,
        labelHydrogen: false,
        showBackfaces: false,
        twoColoredBonds: true,
        bondShadows: true,

        showHydrogen: false,
        addMissingHydrogenAtoms: true
      },

      displayOptions: {
        showHydrogen: true,
        labelCarbon: false,
        labelHydrogen: false,
        atomOverrides: {},
        bondOverrides: {}
      },

      selectedItem: null,

      dragging: false,
      dragMoved: false,
      lastMouse: null,
      renderPending: false
    };

    renderShell(state);
  }

  function numericControlValue(id, fallback) {
    var el = $(id);
    var value = el ? parseFloat(el.value) : fallback;

    if (!isFinite(value)) {
      return fallback;
    }

    return value;
  }

  function atomicNumber(element) {
    if (CIFLord.Elements && CIFLord.Elements.atomicNumber) {
      return CIFLord.Elements.atomicNumber(element);
    }

    return 0;
  }

  function chooseDefaultCenterAtom(model) {
    var atoms = (model.atoms || []).filter(function (atom) {
      return atom.element !== "H";
    });

    if (!atoms.length) {
      atoms = model.atoms || [];
    }

    if (!atoms.length) {
      return "";
    }

    var best = atoms[0];
    var bestZ = atomicNumber(best.element);

    atoms.forEach(function (atom) {
      var z = atomicNumber(atom.element);

      if (z > bestZ) {
        best = atom;
        bestZ = z;
      }
    });

    return best.label || "";
  }

  function chooseBestAtomInComponent(component) {
    var atoms = (component && component.atoms ? component.atoms : []).filter(function (atom) {
      return atom.element !== "H";
    });

    if (!atoms.length && component && component.atoms) {
      atoms = component.atoms.slice();
    }

    if (!atoms.length) {
      return "";
    }

    var best = atoms[0];
    var bestZ = atomicNumber(best.element);

    atoms.forEach(function (atom) {
      var z = atomicNumber(atom.element);

      if (z > bestZ) {
        best = atom;
        bestZ = z;
      }
    });

    return best.label || "";
  }

  function buildBondComponents(model) {
    var atoms = model.atoms || [];
    var atomByLabel = model.atomByLabel || {};
    var adjacency = {};
    var visited = {};
    var components = [];

    atoms.forEach(function (atom) {
      adjacency[atom.label] = adjacency[atom.label] || {};
    });

    (model.bonds || []).forEach(function (bond) {
      var a = bond.atom1Label;
      var b = bond.atom2Label;

      if (!atomByLabel[a] || !atomByLabel[b]) {
        return;
      }

      adjacency[a] = adjacency[a] || {};
      adjacency[b] = adjacency[b] || {};

      adjacency[a][b] = true;
      adjacency[b][a] = true;
    });

    atoms.forEach(function (atom) {
      if (visited[atom.label]) {
        return;
      }

      var queue = [atom.label];
      var labels = [];

      visited[atom.label] = true;

      while (queue.length) {
        var label = queue.shift();

        labels.push(label);

        Object.keys(adjacency[label] || {}).forEach(function (next) {
          if (visited[next]) {
            return;
          }

          visited[next] = true;
          queue.push(next);
        });
      }

      var componentAtoms = labels.map(function (label) {
        return atomByLabel[label];
      }).filter(Boolean);

      components.push({
        id: "component_" + components.length,
        atomLabels: labels,
        atoms: componentAtoms
      });
    });

    components.forEach(function (component) {
      var labelSet = {};

      component.atomLabels.forEach(function (label) {
        labelSet[label] = true;
      });

      component.bondCount = (model.bonds || []).filter(function (bond) {
        return labelSet[bond.atom1Label] && labelSet[bond.atom2Label];
      }).length;

      component.heaviestZ = component.atoms.reduce(function (max, atom) {
        if (atom.element === "H") {
          return max;
        }

        return Math.max(max, atomicNumber(atom.element));
      }, 0);
    });

    components.sort(function (a, b) {
      if (b.heaviestZ !== a.heaviestZ) {
        return b.heaviestZ - a.heaviestZ;
      }

      if (b.atoms.length !== a.atoms.length) {
        return b.atoms.length - a.atoms.length;
      }

      return b.bondCount - a.bondCount;
    });

    components = components.filter(function (component) {
      if (component.atoms.length === 1 && component.atoms[0].element === "H") {
        return false;
      }

      return true;
    });

    components.forEach(function (component, index) {
      component.id = "component_" + index;
      component.index = index + 1;
    });

    return components;
  }

  function componentFormulaText(component) {
    var counts = {};
    var elements = [];

    (component.atoms || []).forEach(function (atom) {
      var element = atom.element || "";

      if (!element) {
        return;
      }

      if (!counts[element]) {
        counts[element] = 0;
        elements.push(element);
      }

      counts[element]++;
    });

    elements.sort(function (a, b) {
      var za = atomicNumber(a);
      var zb = atomicNumber(b);

      if (za !== zb) {
        return zb - za;
      }

      return a.localeCompare(b);
    });

    return elements.map(function (element) {
      return element + (counts[element] > 1 ? counts[element] : "");
    }).join(" ");
  }

  function componentLabel(component) {
    var formula = componentFormulaText(component);

    if (!formula) {
      formula = "unknown composition";
    }

    return (
      "Component " +
      component.index +
      ": " +
      formula +
      " · " +
      component.atoms.length +
      " atoms"
    );
  }

  function componentById(state, id) {
    var ortep = ensureState(state);

    return (ortep.components || []).find(function (component) {
      return component.id === id;
    }) || null;
  }

  function chooseDefaultComponent(components) {
    if (!components || !components.length) {
      return null;
    }

    return components[0];
  }

  function fillComponentSelect(state) {
    var select = $("ortep-select-component");
    var ortep = ensureState(state);
    var components = ortep.components || [];

    if (!select) {
      return;
    }

    if (!components.length) {
      select.innerHTML = "<option value=\"\">No components</option>";
      select.disabled = true;
      return;
    }

    select.innerHTML = components.map(function (component) {
      return (
        "<option value=\"" + escapeHtml(component.id) + "\">" +
          escapeHtml(componentLabel(component)) +
        "</option>"
      );
    }).join("");

    select.disabled = false;

    if (!ortep.options.componentId || !componentById(state, ortep.options.componentId)) {
      ortep.options.componentId = components[0].id;
    }

    select.value = ortep.options.componentId;
  }

  function currentStartLabel(state) {
    var ortep = ensureState(state);

    if (!ortep.model) {
      return "";
    }

    var component = componentById(state, ortep.options.componentId);

    if (component) {
      return chooseBestAtomInComponent(component);
    }

    return chooseDefaultCenterAtom(ortep.model);
  }

  function updateSliderLabels(state) {
    var ortep = ensureState(state);

    var styleScaleValue = $("ortep-style-scale-value");
    var projectionScaleValue = $("ortep-projection-scale-value");
    var labelFontSizeValue = $("ortep-label-font-size-value");
    var maxAtomsValue = $("ortep-max-atoms-value");
    var maxRadiusValue = $("ortep-max-radius-value");
    var maxDepthValue = $("ortep-max-depth-value");

    if (styleScaleValue) {
      styleScaleValue.textContent = Number(ortep.options.styleScale).toFixed(2) + "×";
    }

    if (projectionScaleValue) {
      projectionScaleValue.textContent = String(parseInt(ortep.options.projectionScale, 10)) + " px/Å";
    }

    if (labelFontSizeValue) {
      labelFontSizeValue.textContent = String(parseInt(ortep.options.labelFontSize, 10));
    }

    if (maxAtomsValue) {
      maxAtomsValue.textContent = String(parseInt(ortep.options.maxAtoms, 10));
    }

    if (maxRadiusValue) {
      maxRadiusValue.textContent = String(ortep.options.maxRadius) + " Å";
    }

    if (maxDepthValue) {
      maxDepthValue.textContent = String(parseInt(ortep.options.maxDepth, 10));
    }
  }

  function writeStateToControls(state) {
    var ortep = ensureState(state);
    var options = ortep.options;

    function setValue(id, value) {
      var el = $(id);

      if (el) {
        el.value = String(value);
      }
    }

    function setChecked(id, value) {
      var el = $(id);

      if (el) {
        el.checked = !!value;
      }
    }

    setValue("ortep-select-probability", options.probability);
    setValue("ortep-input-style-scale", options.styleScale);
    setValue("ortep-input-projection-scale", options.projectionScale);
    setValue("ortep-input-label-font-size", options.labelFontSize);
    setValue("ortep-input-max-atoms", options.maxAtoms);
    setValue("ortep-input-max-radius", options.maxRadius);
    setValue("ortep-input-max-depth", options.maxDepth);

    setChecked("ortep-opt-fixed-drawing-scale", options.fixedDrawingScale);
    setChecked("ortep-opt-show-labels", options.showLabels);
    setChecked("ortep-opt-label-c", options.labelCarbon);
    setChecked("ortep-opt-label-h", options.labelHydrogen);
    setChecked("ortep-opt-show-backfaces", options.showBackfaces);
    setChecked("ortep-opt-two-colored-bonds", options.twoColoredBonds);
    setChecked("ortep-opt-show-h", options.showHydrogen);
    setChecked("ortep-opt-bond-shadows", options.bondShadows);
    setChecked("ortep-opt-add-missing-h", options.addMissingHydrogenAtoms);

    var projectionScale = $("ortep-input-projection-scale");

    if (projectionScale) {
      projectionScale.disabled = !options.fixedDrawingScale;
    }

    updateSliderLabels(state);
  }

  function readControlsToState(state) {
    var ortep = ensureState(state);
    var options = ortep.options;

    var componentSelect = $("ortep-select-component");

    if (componentSelect) {
      options.componentId = componentSelect.value || "";
    }

    options.probability = parseInt(numericControlValue("ortep-select-probability", 50), 10);

    options.styleScale = numericControlValue("ortep-input-style-scale", 1);
    options.fixedDrawingScale = $("ortep-opt-fixed-drawing-scale")
      ? $("ortep-opt-fixed-drawing-scale").checked
      : false;
    options.projectionScale = numericControlValue("ortep-input-projection-scale", 80);
    options.labelFontSize = numericControlValue("ortep-input-label-font-size", 14);

    options.maxAtoms = parseInt(numericControlValue("ortep-input-max-atoms", 200), 10);
    options.maxRadius = numericControlValue("ortep-input-max-radius", 20);
    options.maxDepth = parseInt(numericControlValue("ortep-input-max-depth", 14), 10);

    options.showLabels = $("ortep-opt-show-labels")
      ? $("ortep-opt-show-labels").checked
      : true;
    options.labelCarbon = $("ortep-opt-label-c")
      ? $("ortep-opt-label-c").checked
      : false;
    options.labelHydrogen = $("ortep-opt-label-h")
      ? $("ortep-opt-label-h").checked
      : false;
    options.showBackfaces = $("ortep-opt-show-backfaces")
      ? $("ortep-opt-show-backfaces").checked
      : false;
    options.twoColoredBonds = $("ortep-opt-two-colored-bonds")
      ? $("ortep-opt-two-colored-bonds").checked
      : true;
    options.bondShadows = $("ortep-opt-bond-shadows")
      ? $("ortep-opt-bond-shadows").checked
      : true;
    options.showHydrogen = $("ortep-opt-show-h")
      ? $("ortep-opt-show-h").checked
      : false;
    options.addMissingHydrogenAtoms = $("ortep-opt-add-missing-h")
      ? $("ortep-opt-add-missing-h").checked
      : true;

    ortep.displayOptions.showHydrogen = options.showHydrogen;
    ortep.displayOptions.labelCarbon = options.labelCarbon;
    ortep.displayOptions.labelHydrogen = options.labelHydrogen;

    updateSliderLabels(state);
  }

  function setProjectionScaleFromLastFit(state) {
    var ortep = ensureState(state);
    var input = $("ortep-input-projection-scale");

    if (!input || !isFinite(ortep.lastFitScale) || ortep.lastFitScale <= 0) {
      return;
    }

    var value = ortep.lastFitScale;
    var min = parseFloat(input.min);
    var max = parseFloat(input.max);
    var step = parseFloat(input.step);

    if (isFinite(min)) {
      value = Math.max(min, value);
    }

    if (isFinite(max)) {
      value = Math.min(max, value);
    }

    if (isFinite(step) && step > 0) {
      var base = isFinite(min) ? min : 0;
      value = base + Math.round((value - base) / step) * step;
    }

    input.value = String(value);
    ortep.options.projectionScale = value;
  }

  function bondKey(bond) {
    return [bond.atom1Key, bond.atom2Key].sort().join("::");
  }

  function atomMapForFragment(fragment) {
    var map = {};

    (fragment.atoms || []).forEach(function (atom) {
      map[atom.key] = atom;
    });

    return map;
  }

  function overrideValue(value) {
    if (value === true) {
      return "yes";
    }

    if (value === false) {
      return "no";
    }

    return "auto";
  }

  function overrideFromValue(value) {
    if (value === "yes") {
      return true;
    }

    if (value === "no") {
      return false;
    }

    return null;
  }

  function bondStyleValue(value) {
    if (value === "solid") {
      return "solid";
    }

    if (value === "dashed") {
      return "dashed";
    }

    return "auto";
  }

  function bondStyleFromValue(value) {
    if (value === "solid" || value === "dashed") {
      return value;
    }

    return null;
  }

  function displayBondLabel(bond, atomMap) {
    var a = atomMap[bond.atom1Key];
    var b = atomMap[bond.atom2Key];

    var aLabel = a ? (a.displayLabel || a.label) : bond.atom1Key;
    var bLabel = b ? (b.displayLabel || b.label) : bond.atom2Key;

    return aLabel + "–" + bLabel;
  }

  function atomEffectivelyLabelled(state, atom) {
    var ortep = ensureState(state);
    var override = ortep.displayOptions.atomOverrides[atom.key] || {};

    if (override.label === true) {
      return true;
    }

    if (override.label === false) {
      return false;
    }

    if (atom.element === "C") {
      return !!ortep.displayOptions.labelCarbon;
    }

    if (atom.element === "H") {
      return !!ortep.displayOptions.labelHydrogen;
    }

    return true;
  }

  function symmetryOperationHtml(operation) {
    return escapeHtml(operation)
      .replace(/\b([xyz])\b/g, "<em>$1</em>");
  }

  function renderSymmetryNotes(fragment) {
    var notes = fragment.symmetryNotes || [];

    if (!notes.length) {
      return "";
    }

    var label = notes.length === 1
      ? "Symmetry transformation used to generate equivalent atoms:"
      : "Symmetry transformations used to generate equivalent atoms:";

    return (
      "<h3>Symmetry</h3>" +
      "<p class=\"hint\"><strong>" + escapeHtml(label) + "</strong> " +
        notes.map(function (note) {
          return (
            "(" + escapeHtml(note.symbol) + ") " +
            symmetryOperationHtml(note.operation || note.code || "")
          );
        }).join("; ") +
      ".</p>"
    );
  }

  function findAtomByKey(fragment, key) {
    return (fragment.atoms || []).find(function (atom) {
      return atom.key === key;
    }) || null;
  }

  function findBondByKey(fragment, key) {
    return (fragment.bonds || []).find(function (bond) {
      return bondKey(bond) === key;
    }) || null;
  }

  function attachedHydrogenAtomsForAtom(fragment, atom) {
    if (!fragment || !atom || atom.element === "H") {
      return [];
    }

    return (fragment.atoms || []).filter(function (candidate) {
      return (
        candidate.element === "H" &&
        candidate.attachedToAtomKey === atom.key
      );
    });
  }

  function setAttachedHydrogenVisibility(state, atom, visible) {
    var ortep = ensureState(state);
    var hydrogens = attachedHydrogenAtomsForAtom(ortep.fragment, atom);

    hydrogens.forEach(function (hydrogen) {
      ortep.displayOptions.atomOverrides[hydrogen.key] =
        ortep.displayOptions.atomOverrides[hydrogen.key] || {};

      ortep.displayOptions.atomOverrides[hydrogen.key].show = visible;
    });
  }

  function renderSelectedOverride(state) {
    var ortep = ensureState(state);
    var box = $("ortep-selected-override");

    if (!box) {
      return;
    }

    if (!ortep.fragment || !ortep.selectedItem) {
      box.innerHTML = "No atom or bond selected.";
      return;
    }

    var atomOverrides = ortep.displayOptions.atomOverrides || {};
    var bondOverrides = ortep.displayOptions.bondOverrides || {};

    if (ortep.selectedItem.type === "atom") {
      var atom = findAtomByKey(ortep.fragment, ortep.selectedItem.key);

      if (!atom) {
        box.innerHTML = "Selected atom is no longer available.";
        return;
      }

      var atomOverride = atomOverrides[atom.key] || {};
      var attachedHydrogens = attachedHydrogenAtomsForAtom(ortep.fragment, atom);
      var attachedHydrogenText = attachedHydrogens.length
        ? attachedHydrogens.map(function (hydrogen) {
            return atomLabelHtml(hydrogen);
          }).join(", ")
        : "";

      box.innerHTML =
        "<div><strong>Atom:</strong> " + atomLabelHtml(atom) + "</div>" +
        "<div><strong>Element:</strong> " + escapeHtml(atom.element) + "</div>" +
        "<div><strong>Image:</strong> " + escapeHtml(atom.symCode || "identity") + "</div>" +
        (attachedHydrogens.length
          ? "<div><strong>Attached H:</strong> " + attachedHydrogenText + "</div>"
          : "") +
        "<div class=\"ortep-selected-actions\">" +
          "<label>Show" +
            "<select data-ortep-selected-atom-show=\"" + escapeHtml(atom.key) + "\">" +
              "<option value=\"yes\"" + (overrideValue(atomOverride.show) === "yes" ? " selected" : "") + ">show</option>" +
              "<option value=\"no\"" + (overrideValue(atomOverride.show) === "no" ? " selected" : "") + ">hide</option>" +
              "<option value=\"auto\"" + (overrideValue(atomOverride.show) === "auto" ? " selected" : "") + ">auto</option>" +
            "</select>" +
          "</label>" +
          "<label>Label" +
            "<select data-ortep-selected-atom-label=\"" + escapeHtml(atom.key) + "\">" +
              "<option value=\"yes\"" + (overrideValue(atomOverride.label) === "yes" ? " selected" : "") + ">show</option>" +
              "<option value=\"no\"" + (overrideValue(atomOverride.label) === "no" ? " selected" : "") + ">hide</option>" +
              "<option value=\"auto\"" + (overrideValue(atomOverride.label) === "auto" ? " selected" : "") + ">auto</option>" +
            "</select>" +
          "</label>" +
          (attachedHydrogens.length
            ? "<div class=\"table-toolbar\">" +
                "<button type=\"button\" data-ortep-selected-attached-h-show=\"" + escapeHtml(atom.key) + "\">Show attached H</button>" +
                "<button type=\"button\" data-ortep-selected-attached-h-hide=\"" + escapeHtml(atom.key) + "\">Hide attached H</button>" +
              "</div>"
            : "") +
        "</div>";

      return;
    }

    if (ortep.selectedItem.type === "bond") {
      var bond = findBondByKey(ortep.fragment, ortep.selectedItem.key);

      if (!bond) {
        box.innerHTML = "Selected bond is no longer available.";
        return;
      }

      var atomMap = atomMapForFragment(ortep.fragment);
      var bondOverride = bondOverrides[ortep.selectedItem.key] || {};

      box.innerHTML =
        "<div><strong>Bond:</strong> " + escapeHtml(displayBondLabel(bond, atomMap)) + "</div>" +
        "<div><strong>Distance:</strong> " +
          (isFinite(bond.distance) ? Number(bond.distance).toFixed(3) + " Å" : "—") +
        "</div>" +
        "<div class=\"ortep-selected-actions\">" +
          "<label>Show" +
            "<select data-ortep-selected-bond-show=\"" + escapeHtml(ortep.selectedItem.key) + "\">" +
              "<option value=\"yes\"" + (overrideValue(bondOverride.show) === "yes" ? " selected" : "") + ">show</option>" +
              "<option value=\"no\"" + (overrideValue(bondOverride.show) === "no" ? " selected" : "") + ">hide</option>" +
              "<option value=\"auto\"" + (overrideValue(bondOverride.show) === "auto" ? " selected" : "") + ">auto</option>" +
            "</select>" +
          "</label>" +
          "<label>Style" +
            "<select data-ortep-selected-bond-style=\"" + escapeHtml(ortep.selectedItem.key) + "\">" +
              "<option value=\"solid\"" + (bondStyleValue(bondOverride.style) === "solid" ? " selected" : "") + ">solid</option>" +
              "<option value=\"dashed\"" + (bondStyleValue(bondOverride.style) === "dashed" ? " selected" : "") + ">dashed</option>" +
              "<option value=\"auto\"" + (bondStyleValue(bondOverride.style) === "auto" ? " selected" : "") + ">auto</option>" +
            "</select>" +
          "</label>" +
        "</div>";
    }
  }

  function renderOverrideTables(state) {
    var ortep = ensureState(state);
    var atomBox = $("ortep-atom-overrides");
    var bondBox = $("ortep-bond-overrides");

    if (!ortep.fragment) {
      if (atomBox) {
        atomBox.innerHTML = "No fragment.";
      }

      if (bondBox) {
        bondBox.innerHTML = "No fragment.";
      }

      return;
    }

    var search = $("ortep-override-search")
      ? String($("ortep-override-search").value || "").trim().toLowerCase()
      : "";

    var atomOverrides = ortep.displayOptions.atomOverrides || {};
    var bondOverrides = ortep.displayOptions.bondOverrides || {};
    var atomMap = atomMapForFragment(ortep.fragment);

    var atoms = (ortep.fragment.atoms || []).filter(function (atom) {
      if (!search) {
        return true;
      }

      return (
        String(atom.label || "").toLowerCase().indexOf(search) !== -1 ||
        String(atom.displayLabel || "").toLowerCase().indexOf(search) !== -1 ||
        String(atom.element || "").toLowerCase().indexOf(search) !== -1 ||
        String(atom.symCode || "").toLowerCase().indexOf(search) !== -1
      );
    });

    atoms.sort(function (a, b) {
      if (ortep.fragment.start && a.key === ortep.fragment.start.key) return -1;
      if (ortep.fragment.start && b.key === ortep.fragment.start.key) return 1;

      return String(a.label).localeCompare(String(b.label), undefined, {
        numeric: true,
        sensitivity: "base"
      });
    });

    if (atomBox) {
      if (!atoms.length) {
        atomBox.innerHTML = "<p class=\"hint\">No matching atoms.</p>";
      } else {
        atomBox.innerHTML =
          "<table class=\"ortep-table\">" +
            "<thead>" +
              "<tr>" +
                "<th>Atom</th>" +
                "<th>El.</th>" +
                "<th>Img</th>" +
                "<th>Show</th>" +
                "<th>Label</th>" +
              "</tr>" +
            "</thead>" +
            "<tbody>" +
              atoms.map(function (atom) {
                var ov = atomOverrides[atom.key] || {};
                var showValue = overrideValue(ov.show);
                var labelValue = overrideValue(ov.label);

                return (
                  "<tr>" +
                    "<td>" + atomLabelHtml(atom) + "</td>" +
                    "<td>" + escapeHtml(atom.element) + "</td>" +
                    "<td>" + escapeHtml(atom.symCode || "id") + "</td>" +
                    "<td>" +
                      "<select data-ortep-atom-show=\"" + escapeHtml(atom.key) + "\">" +
                        "<option value=\"yes\"" + (showValue === "yes" ? " selected" : "") + ">show</option>" +
                        "<option value=\"no\"" + (showValue === "no" ? " selected" : "") + ">hide</option>" +
                        "<option value=\"auto\"" + (showValue === "auto" ? " selected" : "") + ">auto</option>" +
                      "</select>" +
                    "</td>" +
                    "<td>" +
                      "<select data-ortep-atom-label=\"" + escapeHtml(atom.key) + "\">" +
                        "<option value=\"yes\"" + (labelValue === "yes" ? " selected" : "") + ">show</option>" +
                        "<option value=\"no\"" + (labelValue === "no" ? " selected" : "") + ">hide</option>" +
                        "<option value=\"auto\"" + (labelValue === "auto" ? " selected" : "") + ">auto</option>" +
                      "</select>" +
                    "</td>" +
                  "</tr>"
                );
              }).join("") +
            "</tbody>" +
          "</table>";
      }
    }

    var bonds = (ortep.fragment.bonds || []).filter(function (bond) {
      if (!search) {
        return true;
      }

      return displayBondLabel(bond, atomMap).toLowerCase().indexOf(search) !== -1;
    });

    if (bondBox) {
      if (!bonds.length) {
        bondBox.innerHTML = "<p class=\"hint\">No matching bonds.</p>";
      } else {
        bondBox.innerHTML =
          "<table class=\"ortep-table\">" +
            "<thead>" +
              "<tr>" +
                "<th>Bond</th>" +
                "<th>Å</th>" +
                "<th>Show</th>" +
              "</tr>" +
            "</thead>" +
            "<tbody>" +
              bonds.map(function (bond) {
                var key = bondKey(bond);
                var ov = bondOverrides[key] || {};
                var showValue = overrideValue(ov.show);

                return (
                  "<tr>" +
                    "<td>" + escapeHtml(displayBondLabel(bond, atomMap)) + "</td>" +
                    "<td class=\"number\">" +
                      (isFinite(bond.distance) ? Number(bond.distance).toFixed(3) : "—") +
                    "</td>" +
                    "<td>" +
                      "<select data-ortep-bond-show=\"" + escapeHtml(key) + "\">" +
                        "<option value=\"yes\"" + (showValue === "yes" ? " selected" : "") + ">show</option>" +
                        "<option value=\"no\"" + (showValue === "no" ? " selected" : "") + ">hide</option>" +
                        "<option value=\"auto\"" + (showValue === "auto" ? " selected" : "") + ">auto</option>" +
                      "</select>" +
                    "</td>" +
                  "</tr>"
                );
              }).join("") +
            "</tbody>" +
          "</table>";
      }
    }
  }

  function renderSvgOnly(state) {
    var ortep = ensureState(state);

    if (!ortep.model || !ortep.fragment || !ortep.viewState) {
      return;
    }

    readControlsToState(state);

    var svg = CIFLord.OrtepSvg.makeSvg(ortep.fragment, {
      width: 1100,
      height: 800,

      probability: ortep.options.probability,
      ellipsoidScale: 1,
      styleScale: ortep.options.styleScale,

      fixedDrawingScale: ortep.options.fixedDrawingScale,
      projectionScale: ortep.options.projectionScale,

      labelFontSize: ortep.options.labelFontSize,
      showLabels: ortep.options.showLabels,
      showBackfaces: ortep.options.showBackfaces,
      twoColoredBonds: ortep.options.twoColoredBonds,
      bondShadows: ortep.options.bondShadows,

      viewState: ortep.viewState,
      displayOptions: ortep.displayOptions
    });

    ortep.liveSvg = svg;

    var box = $("ortep-svg-output");

    if (box) {
      box.innerHTML = svg;
    }

    var renderedSvg = box ? box.querySelector("svg") : null;

    if (renderedSvg && !ortep.options.fixedDrawingScale) {
      var fitScale = parseFloat(renderedSvg.getAttribute("data-fit-scale"));

      if (isFinite(fitScale) && fitScale > 0) {
        ortep.lastFitScale = fitScale;
        setProjectionScaleFromLastFit(state);
      }
    }

    writeStateToControls(state);

    var copyPngButton = $("ortep-btn-copy-png");
    var pngButton = $("ortep-btn-download-png");
    var svgButton = $("ortep-btn-download-svg");

    if (copyPngButton) {
      copyPngButton.disabled = false;
    }

    if (pngButton) {
      pngButton.disabled = false;
    }

    if (svgButton) {
      svgButton.disabled = false;
    }
  }

  function renderFragment(state) {
    var ortep = ensureState(state);

    if (!ortep.model) {
      return;
    }

    readControlsToState(state);

    var centerLabel = currentStartLabel(state);

    if (!centerLabel) {
      return;
    }

    var fragment = CIFLord.OrtepSvg.makeBondedComponentForAtom(
      ortep.model,
      centerLabel,
      {
        showHydrogen: true,
        addMissingHydrogenAtoms: ortep.options.addMissingHydrogenAtoms,
        maxAtoms: ortep.options.maxAtoms,
        maxRadius: ortep.options.maxRadius,
        maxDepth: ortep.options.maxDepth
      }
    );

    ortep.fragment = fragment;

    ortep.viewState = CIFLord.OrtepSvg.makeViewState(fragment, {
      probability: ortep.options.probability,
      ellipsoidScale: 1,
      model: ortep.model
    });

    var symmetryBox = $("ortep-symmetry-notes");

    if (symmetryBox) {
      symmetryBox.innerHTML = renderSymmetryNotes(fragment);
    }

    renderOverrideTables(state);
    renderSelectedOverride(state);
    renderSvgOnly(state);
  }

  function ensureInitialized(state) {
    var ortep = ensureState(state);

    if (!state.hasLoadedCif || !state.parsedCif) {
      renderShell(state);
      return;
    }

    if (ortep.initialized && ortep.model) {
      renderShell(state);
      return;
    }

    try {
      ortep.model = CIFLord.OrtepSvg.parseCif(state.parsedCif);
      ortep.components = buildBondComponents(ortep.model);
      ortep.sourceFilename = state.fileName || "";

      var defaultComponent = chooseDefaultComponent(ortep.components);

      if (defaultComponent) {
        ortep.options.componentId = defaultComponent.id;
      }

      ortep.initialized = true;
      ortep.selectedItem = null;
      ortep.displayOptions.atomOverrides = {};
      ortep.displayOptions.bondOverrides = {};

      fillComponentSelect(state);
      writeStateToControls(state);
      renderFragment(state);

      setText(
        "ortep-status",
        state.fileName +
          " · " +
          ortep.model.atoms.length +
          " atoms · " +
          ortep.model.bonds.length +
          " CIF bonds · " +
          ortep.model.adpCount +
          " anisotropic ADPs",
        "hint"
      );
    } catch (e) {
      console.error(e);
      setText("ortep-status", "Parse error: " + e.message, "hint error");
    }
  }

  function renderShell(state) {
    var ortep = ensureState(state);

    if (!state.hasLoadedCif) {
      setText("ortep-status", "No CIF loaded.", "hint");

      var box = $("ortep-svg-output");

      if (box) {
        box.innerHTML = "";
      }

      var copyPngButton = $("ortep-btn-copy-png");
      var pngButton = $("ortep-btn-download-png");
      var svgButton = $("ortep-btn-download-svg");

      if (copyPngButton) {
        copyPngButton.disabled = true;
      }

      if (pngButton) {
        pngButton.disabled = true;
      }

      if (svgButton) {
        svgButton.disabled = true;
      }

      return;
    }

    fillComponentSelect(state);
    writeStateToControls(state);

    if (ortep.initialized && ortep.model) {
      setText(
        "ortep-status",
        state.fileName +
          " · " +
          ortep.model.atoms.length +
          " atoms · " +
          ortep.model.bonds.length +
          " CIF bonds · " +
          ortep.model.adpCount +
          " anisotropic ADPs",
        "hint"
      );
    } else {
      setText("ortep-status", "Open this tab to generate the ORTEP view.", "hint");
    }

    var copyPngButton = $("ortep-btn-copy-png");
    var pngButton = $("ortep-btn-download-png");
    var svgButton = $("ortep-btn-download-svg");
    var enabled = !!ortep.liveSvg;

    if (copyPngButton) {
      copyPngButton.disabled = !enabled;
    }

    if (pngButton) {
      pngButton.disabled = !enabled;
    }

    if (svgButton) {
      svgButton.disabled = !enabled;
    }
  }

  function svgSize(svgText) {
    var doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    var svg = doc.documentElement;

    var width = parseFloat(svg.getAttribute("width"));
    var height = parseFloat(svg.getAttribute("height"));

    if (isFinite(width) && isFinite(height)) {
      return {
        width: width,
        height: height
      };
    }

    var viewBox = String(svg.getAttribute("viewBox") || "").trim().split(/\s+/);

    if (viewBox.length === 4) {
      width = parseFloat(viewBox[2]);
      height = parseFloat(viewBox[3]);

      if (isFinite(width) && isFinite(height)) {
        return {
          width: width,
          height: height
        };
      }
    }

    return {
      width: 1100,
      height: 800
    };
  }

  function downloadBlob(filename, blob) {
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
  }

  function filenameBase(filename) {
    filename = String(filename || "").trim();

    if (!filename) {
      return "ortep";
    }

    filename = filename.replace(/^.*[\\/]/, "");
    filename = filename.replace(/\.[^.]*$/, "");

    return filename || "ortep";
  }

  function safeFilenamePart(value) {
    value = String(value || "").trim();

    if (!value) {
      return "";
    }

    return value
      .replace(/[^\w.\-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function currentComponentFilenamePart(state) {
    var ortep = ensureState(state);
    var component = componentById(state, ortep.options.componentId);

    if (!component) {
      return "";
    }

    return safeFilenamePart(
      "component_" +
      component.index +
      "_" +
      componentFormulaText(component).replace(/\s+/g, "_")
    );
  }

  function currentExportBaseName(state) {
    var base = safeFilenamePart(filenameBase(state.fileName || "ortep"));
    var componentPart = currentComponentFilenamePart(state);

    if (componentPart) {
      return base + "_" + componentPart + "_ortep";
    }

    return base + "_ortep";
  }

  function svgToPngBlob(svgText, dpi, onSuccess, onError) {
    dpi = dpi || 300;

    /*
      Browser canvas PNG export does not reliably embed DPI metadata.
      We therefore export a 300-dpi-equivalent pixel size using the
      CSS pixel reference of 96 dpi.
    */
    var scale = dpi / 96;
    var size = svgSize(svgText);

    var svgBlob = new Blob([svgText], {
      type: "image/svg+xml;charset=utf-8"
    });

    var url = URL.createObjectURL(svgBlob);
    var img = new Image();

    img.onload = function () {
      var canvas = document.createElement("canvas");

      canvas.width = Math.round(size.width * scale);
      canvas.height = Math.round(size.height * scale);

      var ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(url);

      canvas.toBlob(function (blob) {
        if (!blob) {
          if (typeof onError === "function") {
            onError(new Error("PNG export failed."));
          }

          return;
        }

        if (typeof onSuccess === "function") {
          onSuccess(blob);
        }
      }, "image/png");
    };

    img.onerror = function () {
      URL.revokeObjectURL(url);

      if (typeof onError === "function") {
        onError(new Error("PNG export failed."));
      }
    };

    img.src = url;
  }

  function svgToPngBlobPromise(svgText, dpi) {
    return new Promise(function (resolve, reject) {
      svgToPngBlob(
        svgText,
        dpi || 300,
        resolve,
        reject
      );
    });
  }

  function downloadPngFromSvg(svgText, filename, dpi) {
    svgToPngBlob(
      svgText,
      dpi || 300,
      function (blob) {
        downloadBlob(filename, blob);
      },
      function () {
        alert("PNG export failed.");
      }
    );
  }

  function flashButtonText(button, text) {
    if (!button) {
      return;
    }

    var oldText = button.textContent;

    button.textContent = text;
    button.disabled = true;

    setTimeout(function () {
      button.textContent = oldText;
      button.disabled = false;
    }, 1400);
  }

  function copyPngFromSvg(svgText, button) {
    if (!navigator.clipboard || !navigator.clipboard.write || !window.ClipboardItem) {
      alert("Copy PNG is not supported by this browser or context.");
      return;
    }

    if (window.isSecureContext === false) {
      alert("Copy PNG requires a secure browser context such as HTTPS or localhost.");
      return;
    }

    try {
      /*
        Important:
        navigator.clipboard.write() must be called directly from the button
        click/user gesture. Therefore the PNG Blob is provided as a Promise
        to ClipboardItem instead of waiting for canvas.toBlob first.
      */
      var pngBlobPromise = svgToPngBlobPromise(svgText, 300);

      var item = new ClipboardItem({
        "image/png": pngBlobPromise
      });

      navigator.clipboard.write([item]).then(function () {
        flashButtonText(button, "Copied");
      }).catch(function (error) {
        console.error("Copy PNG failed:", error);
        alert(
          "Copy PNG failed" +
          (error && error.name ? ": " + error.name : "") +
          (error && error.message ? " — " + error.message : ".")
        );
      });
    } catch (error) {
      console.error("Copy PNG failed:", error);
      alert(
        "Copy PNG failed" +
        (error && error.name ? ": " + error.name : "") +
        (error && error.message ? " — " + error.message : ".")
      );
    }
  }

  function bindControls(state) {
    var componentSelect = $("ortep-select-component");

    if (componentSelect) {
      componentSelect.addEventListener("change", function () {
        var ortep = ensureState(state);

        ortep.options.componentId = this.value || "";
        ortep.selectedItem = null;

        if (ortep.model) {
          renderFragment(state);
        }
      });
    }

    [
      "ortep-select-probability",
      "ortep-opt-show-labels",
      "ortep-opt-show-backfaces",
      "ortep-opt-two-colored-bonds",
      "ortep-opt-bond-shadows",
      "ortep-opt-show-h",
      "ortep-opt-label-c",
      "ortep-opt-label-h"
    ].forEach(function (id) {
      var el = $(id);

      if (!el) {
        return;
      }

      el.addEventListener("change", function () {
        var ortep = ensureState(state);

        if (!ortep.fragment) {
          readControlsToState(state);
          writeStateToControls(state);
          return;
        }

        renderSvgOnly(state);
        renderOverrideTables(state);
        renderSelectedOverride(state);
      });
    });

    [
      "ortep-input-style-scale",
      "ortep-input-label-font-size"
    ].forEach(function (id) {
      var el = $(id);

      if (!el) {
        return;
      }

      el.addEventListener("input", function () {
        var ortep = ensureState(state);

        if (!ortep.fragment) {
          readControlsToState(state);
          writeStateToControls(state);
          return;
        }

        renderSvgOnly(state);
      });
    });

    var fixedDrawingScale = $("ortep-opt-fixed-drawing-scale");

    if (fixedDrawingScale) {
      fixedDrawingScale.addEventListener("change", function () {
        var ortep = ensureState(state);

        readControlsToState(state);

        if (ortep.options.fixedDrawingScale) {
          setProjectionScaleFromLastFit(state);
        }

        writeStateToControls(state);

        if (ortep.fragment) {
          renderSvgOnly(state);
        }
      });
    }

    var projectionScale = $("ortep-input-projection-scale");

    if (projectionScale) {
      projectionScale.addEventListener("input", function () {
        var ortep = ensureState(state);

        if (!ortep.fragment) {
          readControlsToState(state);
          writeStateToControls(state);
          return;
        }

        renderSvgOnly(state);
      });
    }

    [
      "ortep-input-max-atoms",
      "ortep-input-max-radius",
      "ortep-input-max-depth"
    ].forEach(function (id) {
      var el = $(id);

      if (!el) {
        return;
      }

      el.addEventListener("input", function () {
        readControlsToState(state);
        writeStateToControls(state);
      });
    });

    [
      "ortep-opt-add-missing-h",
      "ortep-input-max-atoms",
      "ortep-input-max-radius",
      "ortep-input-max-depth"
    ].forEach(function (id) {
      var el = $(id);

      if (!el) {
        return;
      }

      el.addEventListener("change", function () {
        var ortep = ensureState(state);

        readControlsToState(state);

        if (ortep.model) {
          renderFragment(state);
        }
      });
    });

    var search = $("ortep-override-search");

    if (search) {
      search.addEventListener("input", function () {
        renderOverrideTables(state);
      });
    }
  }

  function bindOverrideControls(state) {
    document.body.addEventListener("change", function (event) {
      var target = event.target;
      var ortep = ensureState(state);

      function updateAtomOverride(key, prop, value) {
        ortep.displayOptions.atomOverrides[key] =
          ortep.displayOptions.atomOverrides[key] || {};

        ortep.displayOptions.atomOverrides[key][prop] = value;
      }

      function updateBondOverride(key, prop, value) {
        ortep.displayOptions.bondOverrides[key] =
          ortep.displayOptions.bondOverrides[key] || {};

        ortep.displayOptions.bondOverrides[key][prop] = value;
      }

      if (target.matches("[data-ortep-selected-atom-show]")) {
        updateAtomOverride(
          target.getAttribute("data-ortep-selected-atom-show"),
          "show",
          overrideFromValue(target.value)
        );

        renderSvgOnly(state);
        renderOverrideTables(state);
        renderSelectedOverride(state);
        return;
      }

      if (target.matches("[data-ortep-selected-atom-label]")) {
        updateAtomOverride(
          target.getAttribute("data-ortep-selected-atom-label"),
          "label",
          overrideFromValue(target.value)
        );

        renderSvgOnly(state);
        renderOverrideTables(state);
        renderSelectedOverride(state);
        return;
      }

      if (target.matches("[data-ortep-selected-bond-show]")) {
        updateBondOverride(
          target.getAttribute("data-ortep-selected-bond-show"),
          "show",
          overrideFromValue(target.value)
        );

        renderSvgOnly(state);
        renderOverrideTables(state);
        renderSelectedOverride(state);
        return;
      }

      if (target.matches("[data-ortep-selected-bond-style]")) {
        updateBondOverride(
          target.getAttribute("data-ortep-selected-bond-style"),
          "style",
          bondStyleFromValue(target.value)
        );

        renderSvgOnly(state);
        renderOverrideTables(state);
        renderSelectedOverride(state);
        return;
      }

      if (target.matches("[data-ortep-atom-show]")) {
        updateAtomOverride(
          target.getAttribute("data-ortep-atom-show"),
          "show",
          overrideFromValue(target.value)
        );

        renderSvgOnly(state);
        renderOverrideTables(state);
        renderSelectedOverride(state);
        return;
      }

      if (target.matches("[data-ortep-atom-label]")) {
        updateAtomOverride(
          target.getAttribute("data-ortep-atom-label"),
          "label",
          overrideFromValue(target.value)
        );

        renderSvgOnly(state);
        renderOverrideTables(state);
        renderSelectedOverride(state);
        return;
      }

      if (target.matches("[data-ortep-bond-show]")) {
        updateBondOverride(
          target.getAttribute("data-ortep-bond-show"),
          "show",
          overrideFromValue(target.value)
        );

        renderSvgOnly(state);
        renderOverrideTables(state);
        renderSelectedOverride(state);
      }
    });

    document.body.addEventListener("click", function (event) {
      var target = event.target;
      var ortep = ensureState(state);

      if (
        !target.matches("[data-ortep-selected-attached-h-show]") &&
        !target.matches("[data-ortep-selected-attached-h-hide]")
      ) {
        return;
      }

      var atomKey =
        target.getAttribute("data-ortep-selected-attached-h-show") ||
        target.getAttribute("data-ortep-selected-attached-h-hide");

      var atom = findAtomByKey(ortep.fragment, atomKey);

      if (!atom) {
        return;
      }

      var visible = target.matches("[data-ortep-selected-attached-h-show]");

      setAttachedHydrogenVisibility(state, atom, visible);

      renderSvgOnly(state);
      renderOverrideTables(state);
      renderSelectedOverride(state);
    });
  }

  function bindResetButtons(state) {
    var showHidden = $("ortep-btn-show-hidden-atoms");
    var resetOverrides = $("ortep-btn-reset-overrides");

    if (showHidden) {
      showHidden.addEventListener("click", function () {
        var ortep = ensureState(state);

        Object.keys(ortep.displayOptions.atomOverrides || {}).forEach(function (key) {
          var override = ortep.displayOptions.atomOverrides[key];

          if (override && override.show === false) {
            override.show = null;
          }
        });

        renderSvgOnly(state);
        renderOverrideTables(state);
        renderSelectedOverride(state);
      });
    }

    if (resetOverrides) {
      resetOverrides.addEventListener("click", function () {
        var ortep = ensureState(state);

        ortep.displayOptions.atomOverrides = {};
        ortep.displayOptions.bondOverrides = {};
        ortep.selectedItem = null;

        renderSvgOnly(state);
        renderOverrideTables(state);
        renderSelectedOverride(state);
      });
    }
  }

  function bindDownloads(state) {
    var copyPngButton = $("ortep-btn-copy-png");
    var pngButton = $("ortep-btn-download-png");
    var svgButton = $("ortep-btn-download-svg");

    if (copyPngButton) {
      copyPngButton.addEventListener("click", function () {
        var ortep = ensureState(state);

        if (!ortep.liveSvg) {
          return;
        }

        copyPngFromSvg(ortep.liveSvg, copyPngButton);
      });
    }

    if (pngButton) {
      pngButton.addEventListener("click", function () {
        var ortep = ensureState(state);

        if (!ortep.liveSvg) {
          return;
        }

        downloadPngFromSvg(
          ortep.liveSvg,
          currentExportBaseName(state) + "_300dpi.png",
          300
        );
      });
    }

    if (svgButton) {
      svgButton.addEventListener("click", function () {
        var ortep = ensureState(state);

        if (!ortep.liveSvg) {
          return;
        }

        var blob = new Blob([ortep.liveSvg], {
          type: "image/svg+xml;charset=utf-8"
        });

        downloadBlob(currentExportBaseName(state) + ".svg", blob);
      });
    }
  }

  function bindSvgSelection(state) {
    var svgBox = $("ortep-svg-output");

    if (!svgBox) {
      return;
    }

    svgBox.addEventListener("click", function (event) {
      var ortep = ensureState(state);

      if (!ortep.fragment || ortep.dragMoved) {
        return;
      }

      var atomEl = event.target.closest("[data-atom-key]");
      var bondEl = event.target.closest("[data-bond-key]");

      var useCommand = event.ctrlKey || event.metaKey;
      var useShift = event.shiftKey;

      if (atomEl) {
        var atomKey = atomEl.getAttribute("data-atom-key");
        var atom = findAtomByKey(ortep.fragment, atomKey);

        if (!atom) {
          return;
        }

        ortep.selectedItem = {
          type: "atom",
          key: atomKey
        };

        if (useShift && useCommand) {
          event.preventDefault();

          setAttachedHydrogenVisibility(state, atom, true);

          renderSvgOnly(state);
          renderOverrideTables(state);
          renderSelectedOverride(state);
          return;
        }

        if (useShift) {
          event.preventDefault();

          ortep.displayOptions.atomOverrides[atomKey] =
            ortep.displayOptions.atomOverrides[atomKey] || {};

          ortep.displayOptions.atomOverrides[atomKey].label =
            atomEffectivelyLabelled(state, atom) ? false : true;

          renderSvgOnly(state);
          renderOverrideTables(state);
          renderSelectedOverride(state);
          return;
        }

        if (useCommand) {
          event.preventDefault();

          ortep.displayOptions.atomOverrides[atomKey] =
            ortep.displayOptions.atomOverrides[atomKey] || {};

          ortep.displayOptions.atomOverrides[atomKey].show = false;

          renderSvgOnly(state);
          renderOverrideTables(state);
          renderSelectedOverride(state);
          return;
        }

        renderSelectedOverride(state);
        return;
      }

      if (bondEl) {
        var selectedBondKey = bondEl.getAttribute("data-bond-key");

        ortep.selectedItem = {
          type: "bond",
          key: selectedBondKey
        };

        if (useCommand) {
          event.preventDefault();

          ortep.displayOptions.bondOverrides[selectedBondKey] =
            ortep.displayOptions.bondOverrides[selectedBondKey] || {};

          ortep.displayOptions.bondOverrides[selectedBondKey].show = false;

          renderSvgOnly(state);
          renderOverrideTables(state);
          renderSelectedOverride(state);
          return;
        }

        renderSelectedOverride(state);
      }
    });

    svgBox.addEventListener("contextmenu", function (event) {
      if (
        event.target.closest("[data-atom-key]") ||
        event.target.closest("[data-bond-key]")
      ) {
        event.preventDefault();
      }
    });
  }

  function bindMouseRotation(state) {
    var svgBox = $("ortep-svg-output");

    if (!svgBox) {
      return;
    }

    svgBox.addEventListener("mousedown", function (event) {
      var ortep = ensureState(state);

      if (!ortep.fragment || !ortep.viewState) {
        return;
      }

      ortep.dragging = true;
      ortep.dragMoved = false;
      ortep.lastMouse = {
        x: event.clientX,
        y: event.clientY
      };

      event.preventDefault();
    });

    window.addEventListener("mousemove", function (event) {
      var ortep = ensureState(state);

      if (!ortep.dragging || !ortep.lastMouse || !ortep.viewState) {
        return;
      }

      var dx = event.clientX - ortep.lastMouse.x;
      var dy = event.clientY - ortep.lastMouse.y;

      if (Math.abs(dx) + Math.abs(dy) > 2) {
        ortep.dragMoved = true;
      }

      ortep.lastMouse = {
        x: event.clientX,
        y: event.clientY
      };

      ortep.viewState.view = CIFLord.OrtepSvg.rotateView(
        ortep.viewState.view,
        dx,
        dy,
        0.008
      );

      if (!ortep.renderPending) {
        ortep.renderPending = true;

        requestAnimationFrame(function () {
          ortep.renderPending = false;
          renderSvgOnly(state);
        });
      }
    });

    window.addEventListener("mouseup", function () {
      var ortep = ensureState(state);

      ortep.dragging = false;
      ortep.lastMouse = null;

      setTimeout(function () {
        ortep.dragMoved = false;
      }, 0);
    });

    svgBox.addEventListener("dblclick", function () {
      var ortep = ensureState(state);

      if (!ortep.fragment || !ortep.model) {
        return;
      }

      ortep.viewState = CIFLord.OrtepSvg.makeViewState(ortep.fragment, {
        probability: ortep.options.probability,
        ellipsoidScale: 1,
        model: ortep.model
      });

      renderSvgOnly(state);
    });
  }

  CIFLord.OrtepUI = {
    init: function (state) {
      ensureState(state);

      bindControls(state);
      bindOverrideControls(state);
      bindResetButtons(state);
      bindDownloads(state);
      bindSvgSelection(state);
      bindMouseRotation(state);

      renderShell(state);
    },

    reset: reset,
    renderShell: renderShell,
    ensureInitialized: ensureInitialized
  };
})();