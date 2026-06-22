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

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatNumber(value, digits) {
    var n = Number(value);

    if (!isFinite(n)) {
      return "-";
    }

    return n.toFixed(digits);
  }

  function ensureGeometryState(state) {
    state.geometryOptions = state.geometryOptions || {
      centerElement: "",
      centerAtom: "",
      selectedLigandKeysByCenter: {}
    };

    state.geometryOptions.selectedLigandKeysByCenter =
      state.geometryOptions.selectedLigandKeysByCenter || {};

    state.geometryResults = state.geometryResults || [];

    return state.geometryOptions;
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

  function collectElements(state) {
    if (state.elements && state.elements.length) {
      return state.elements.slice();
    }
  
    var seen = {};
    var out = [];
  
    (state.atoms || []).forEach(function (atom) {
      var el = normalizeElement(atom.element);
  
      if (!el || el === "H" || seen[el]) {
        return;
      }
  
      seen[el] = true;
      out.push(el);
    });
  
    out.sort();
  
    return out;
  }

  function collectAtomsForElement(state, element) {
    return (state.atoms || [])
      .filter(function (atom) {
        return normalizeElement(atom.element) === element;
      })
      .map(function (atom) {
        return atom.label;
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return String(a).localeCompare(String(b), undefined, {
          numeric: true,
          sensitivity: "base"
        });
      });
  }

  function setSelectOptions(id, values, preferred) {
    var el = $(id);

    if (!el) {
      return "";
    }

    values = values || [];

    if (!values.length) {
      el.innerHTML = "<option value=\"\">—</option>";
      el.value = "";
      return "";
    }

    var current = preferred || el.value || "";

    if (values.indexOf(current) === -1) {
      current = values[0];
    }

    el.innerHTML = values.map(function (value) {
      return "<option value=\"" + escapeHtml(value) + "\">" + escapeHtml(value) + "</option>";
    }).join("");

    el.value = current;

    return current;
  }

  function getAtomByLabel(state, label) {
    return (state.atoms || []).find(function (atom) {
      return atom.label === label;
    }) || null;
  }

  function isIdentitySymCode(code) {
    code = String(code || "").trim();

    return (
      !code ||
      code === "." ||
      code === "?" ||
      code === "555" ||
      code === "1_555"
    );
  }

  function parseFraction(term) {
    term = String(term || "").trim();

    if (!term) {
      return 0;
    }

    if (term.indexOf("/") !== -1) {
      var p = term.split("/");
      var a = parseFloat(p[0]);
      var b = parseFloat(p[1]);

      if (!b) {
        return 0;
      }

      return a / b;
    }

    return parseFloat(term) || 0;
  }

  function parseSymComponent(component) {
    component = String(component || "").replace(/\s+/g, "");

    var result = {
      x: 0,
      y: 0,
      z: 0,
      c: 0
    };

    var normalized = component.replace(/-/g, "+-");

    if (normalized.charAt(0) === "+") {
      normalized = normalized.slice(1);
    }

    normalized.split("+").forEach(function (part) {
      if (!part) {
        return;
      }

      var sign = 1;

      if (part.charAt(0) === "-") {
        sign = -1;
        part = part.slice(1);
      }

      if (part.indexOf("x") !== -1) {
        result.x += sign;
      } else if (part.indexOf("y") !== -1) {
        result.y += sign;
      } else if (part.indexOf("z") !== -1) {
        result.z += sign;
      } else {
        result.c += sign * parseFraction(part);
      }
    });

    return result;
  }

  function parseSymOperation(operation) {
    operation = String(operation || "x,y,z")
      .replace(/^['"]|['"]$/g, "");

    var parts = operation.split(",");

    if (parts.length !== 3) {
      parts = ["x", "y", "z"];
    }

    return [
      parseSymComponent(parts[0]),
      parseSymComponent(parts[1]),
      parseSymComponent(parts[2])
    ];
  }

  function parseSymCode(code) {
    code = String(code || "").trim();

    if (isIdentitySymCode(code)) {
      return {
        opId: "1",
        translation: "555"
      };
    }

    var parts = code.split("_");

    if (parts.length === 2) {
      return {
        opId: parts[0],
        translation: parts[1] || "555"
      };
    }

    if (/^\d{3}$/.test(code)) {
      return {
        opId: "1",
        translation: code
      };
    }

    return {
      opId: parts[0] || "1",
      translation: "555"
    };
  }

  function getSymOperation(state, opId) {
    var op = (state.symmetryOps || []).find(function (entry) {
      return String(entry.id) === String(opId);
    });

    return op ? op.operation : "x,y,z";
  }

  function applySymToFractional(atom, symParsed, translation) {
    translation = String(translation || "555");

    var offsets = [
      parseInt(translation.charAt(0) || "5", 10) - 5,
      parseInt(translation.charAt(1) || "5", 10) - 5,
      parseInt(translation.charAt(2) || "5", 10) - 5
    ];

    function apply(comp, offset) {
      return (
        comp.x * atom.x +
        comp.y * atom.y +
        comp.z * atom.z +
        comp.c +
        offset
      );
    }

    return {
      x: apply(symParsed[0], offsets[0]),
      y: apply(symParsed[1], offsets[1]),
      z: apply(symParsed[2], offsets[2])
    };
  }

  function orthMatrix(cell) {
    var a = Number(cell.a);
    var b = Number(cell.b);
    var c = Number(cell.c);

    var al = Number(cell.alpha) * Math.PI / 180;
    var be = Number(cell.beta) * Math.PI / 180;
    var ga = Number(cell.gamma) * Math.PI / 180;

    var cosA = Math.cos(al);
    var cosB = Math.cos(be);
    var cosG = Math.cos(ga);
    var sinG = Math.sin(ga);

    var V = Math.sqrt(
      1 -
      cosA * cosA -
      cosB * cosB -
      cosG * cosG +
      2 * cosA * cosB * cosG
    );

    return [
      [a, b * cosG, c * cosB],
      [0, b * sinG, c * (cosA - cosB * cosG) / sinG],
      [0, 0, c * V / sinG]
    ];
  }

  function fracToCart(M, fx, fy, fz) {
    return [
      M[0][0] * fx + M[0][1] * fy + M[0][2] * fz,
      M[1][0] * fx + M[1][1] * fy + M[1][2] * fz,
      M[2][0] * fx + M[2][1] * fy + M[2][2] * fz
    ];
  }

  function distance3(a, b) {
    var dx = Number(a.x) - Number(b.x);
    var dy = Number(a.y) - Number(b.y);
    var dz = Number(a.z) - Number(b.z);

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function makeCartesianAtom(state, atom, symCode) {
    if (!atom || !state.cell) {
      return null;
    }

    var cell = state.cell;

    if (
      !isFinite(cell.a) ||
      !isFinite(cell.b) ||
      !isFinite(cell.c) ||
      !isFinite(cell.alpha) ||
      !isFinite(cell.beta) ||
      !isFinite(cell.gamma)
    ) {
      return null;
    }

    var frac;

    if (isIdentitySymCode(symCode)) {
      frac = {
        x: Number(atom.x),
        y: Number(atom.y),
        z: Number(atom.z)
      };
    } else {
      var parsedCode = parseSymCode(symCode);
      var operation = getSymOperation(state, parsedCode.opId);
      var symParsed = parseSymOperation(operation);

      frac = applySymToFractional(atom, symParsed, parsedCode.translation);
    }

    var M = orthMatrix(cell);
    var cart = fracToCart(M, frac.x, frac.y, frac.z);

    return {
      label: atom.label,
      element: normalizeElement(atom.element),

      fract_x: frac.x,
      fract_y: frac.y,
      fract_z: frac.z,

      x: cart[0],
      y: cart[1],
      z: cart[2]
    };
  }

  function symDisplay(symCode) {
    if (isIdentitySymCode(symCode)) {
      return "—";
    }

    return String(symCode || "");
  }

  function ligandKey(ligand) {
    return [
      ligand.label || "",
      ligand.element || "",
      ligand.symCode || "",
      Number(ligand.x).toFixed(4),
      Number(ligand.y).toFixed(4),
      Number(ligand.z).toFixed(4)
    ].join("|");
  }

  function findCifBondLigands(state, centerLabel) {
    var centerAtom = getAtomByLabel(state, centerLabel);

    if (!centerAtom) {
      return [];
    }

    var centerCart = makeCartesianAtom(state, centerAtom, "");

    if (!centerCart) {
      return [];
    }

    var ligands = [];
    var seen = {};

    (state.bonds || []).forEach(function (bond) {
      var ligandLabel = "";
      var ligandSymCode = "";
      var centerSymCode = "";

      if (bond.atom1Label === centerLabel) {
        ligandLabel = bond.atom2Label;
        ligandSymCode = bond.sym2Code || "";
        centerSymCode = bond.sym1Code || "";
      } else if (bond.atom2Label === centerLabel) {
        ligandLabel = bond.atom1Label;
        ligandSymCode = bond.sym1Code || "";
        centerSymCode = bond.sym2Code || "";
      } else {
        return;
      }

      /*
        Phase 1: selected center is treated as the asymmetric-unit atom.
        Bonds where the selected center itself carries a non-identity symmetry
        code are skipped to avoid mixing different center images.
      */
      if (!isIdentitySymCode(centerSymCode)) {
        return;
      }

      var ligandAtom = getAtomByLabel(state, ligandLabel);

      if (!ligandAtom) {
        return;
      }

      var ligandCart = makeCartesianAtom(state, ligandAtom, ligandSymCode);

      if (!ligandCart) {
        return;
      }

      var ligand = {
        label: ligandAtom.label,
        element: normalizeElement(ligandAtom.element),
        symCode: ligandSymCode,

        x: ligandCart.x,
        y: ligandCart.y,
        z: ligandCart.z,

        fract_x: ligandCart.fract_x,
        fract_y: ligandCart.fract_y,
        fract_z: ligandCart.fract_z,

        cifValue: bond.value,
        distance: isFinite(bond.numericalValue)
          ? bond.numericalValue
          : distance3(centerCart, ligandCart),

        symmetry: symDisplay(ligandSymCode)
      };

      var key = ligandKey(ligand);

      if (seen[key]) {
        return;
      }

      seen[key] = true;
      ligands.push(ligand);
    });

    ligands.sort(function (a, b) {
      return a.distance - b.distance;
    });

    return ligands;
  }

  function activeLigandsForCenter(state, centerLabel, ligands) {
    var options = ensureGeometryState(state);
    var saved = options.selectedLigandKeysByCenter[centerLabel];

    if (!saved) {
      saved = {};
      ligands.forEach(function (ligand) {
        saved[ligandKey(ligand)] = true;
      });
      options.selectedLigandKeysByCenter[centerLabel] = saved;
    } else {
      ligands.forEach(function (ligand) {
        var key = ligandKey(ligand);

        if (typeof saved[key] !== "boolean") {
          saved[key] = true;
        }
      });
    }

    return ligands.filter(function (ligand) {
      return saved[ligandKey(ligand)] !== false;
    });
  }

  function angle3(center, a, b) {
    var va = [
      Number(a.x) - Number(center.x),
      Number(a.y) - Number(center.y),
      Number(a.z) - Number(center.z)
    ];

    var vb = [
      Number(b.x) - Number(center.x),
      Number(b.y) - Number(center.y),
      Number(b.z) - Number(center.z)
    ];

    var na = geomNorm(va);
    var nb = geomNorm(vb);

    if (na < 1e-14 || nb < 1e-14) {
      return 0;
    }

    var cos = geomDot(va, vb) / (na * nb);

    return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
  }

  function allAngles(center, ligands) {
    var angles = [];

    for (var i = 0; i < ligands.length; i++) {
      for (var j = i + 1; j < ligands.length; j++) {
        angles.push(angle3(center, ligands[i], ligands[j]));
      }
    }

    return angles;
  }

  function calcDescriptors(center, ligands) {
    var cn = ligands.length;
    var result = {};
    var angles = allAngles(center, ligands);
    var sorted = angles.slice().sort(function (a, b) {
      return b - a;
    });

    if (sorted.length >= 2) {
      var beta = sorted[0];
      var alpha = sorted[1];

      if (cn === 4 && angles.length === 6) {
        result["τ₄"] = (360 - (alpha + beta)) / (360 - 2 * 109.5);
        result["τ₄′"] =
          (beta - alpha) / (360 - 109.5) +
          (180 - beta) / (180 - 109.5);
      }

      if (cn === 5 && angles.length === 10) {
        result["τ₅"] = (beta - alpha) / 60;
      }
    }

    var volume = calcPolyhedralVolume(center, ligands);

    if (volume !== null && volume !== undefined && isFinite(volume)) {
      result["V /Å³"] = volume;
    }

    return result;
  }

  function calcPolyhedralVolume(center, ligands) {
    if (!ligands || ligands.length < 3) {
      return null;
    }

    var points = [[0, 0, 0]];

    ligands.forEach(function (ligand) {
      points.push([
        Number(ligand.x) - Number(center.x),
        Number(ligand.y) - Number(center.y),
        Number(ligand.z) - Number(center.z)
      ]);
    });

    if (points.length < 4) {
      return null;
    }

    try {
      return convexHullVolume(points);
    } catch (e) {
      return null;
    }
  }

  function convexHullVolume(points) {
    var n = points.length;
    var eps = 1e-9;
    var centroid = geomCentroid(points);
    var planes = {};

    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        for (var k = j + 1; k < n; k++) {
          var a = points[i];
          var b = points[j];
          var c = points[k];

          var normal = geomCross(
            geomSub(b, a),
            geomSub(c, a)
          );

          var norm = geomNorm(normal);

          if (norm < eps) {
            continue;
          }

          normal = geomScale(normal, 1 / norm);

          var d = -geomDot(normal, a);
          var pos = 0;
          var neg = 0;

          for (var m = 0; m < n; m++) {
            var s = geomDot(normal, points[m]) + d;

            if (s > 1e-7) {
              pos++;
            } else if (s < -1e-7) {
              neg++;
            }
          }

          if (pos > 0 && neg > 0) {
            continue;
          }

          if (geomDot(normal, centroid) + d > 0) {
            normal = geomScale(normal, -1);
            d = -d;
          }

          var key = [
            normal[0].toFixed(6),
            normal[1].toFixed(6),
            normal[2].toFixed(6),
            d.toFixed(6)
          ].join(",");

          if (!planes[key]) {
            planes[key] = {
              normal: normal,
              d: d,
              indices: {}
            };
          }

          for (m = 0; m < n; m++) {
            if (Math.abs(geomDot(normal, points[m]) + d) < 1e-6) {
              planes[key].indices[m] = true;
            }
          }
        }
      }
    }

    var volume = 0;

    Object.keys(planes).forEach(function (key) {
      var plane = planes[key];
      var ids = Object.keys(plane.indices).map(function (x) {
        return parseInt(x, 10);
      });

      if (ids.length < 3) {
        return;
      }

      var facetPoints = ids.map(function (idx) {
        return points[idx];
      });

      var ordered = orderFacetVertices(facetPoints, plane.normal);

      if (ordered.length < 3) {
        return;
      }

      var p0 = ordered[0];

      for (var i = 1; i < ordered.length - 1; i++) {
        var p1 = ordered[i];
        var p2 = ordered[i + 1];

        volume += geomDot(p0, geomCross(p1, p2)) / 6;
      }
    });

    return Math.abs(volume);
  }

  function orderFacetVertices(points, normal) {
    var c = geomCentroid(points);

    var u = geomNormalize(geomSub(points[0], c));

    if (geomNorm(u) < 1e-12) {
      u = arbitraryFacetAxis(normal);
    }

    var v = geomNormalize(geomCross(normal, u));

    return points.slice().sort(function (pA, pB) {
      var a = geomSub(pA, c);
      var b = geomSub(pB, c);

      var angA = Math.atan2(geomDot(a, v), geomDot(a, u));
      var angB = Math.atan2(geomDot(b, v), geomDot(b, u));

      return angA - angB;
    });
  }

  function arbitraryFacetAxis(normal) {
    var ax = Math.abs(normal[0]);
    var ay = Math.abs(normal[1]);
    var az = Math.abs(normal[2]);

    var basis;

    if (ax <= ay && ax <= az) {
      basis = [1, 0, 0];
    } else if (ay <= ax && ay <= az) {
      basis = [0, 1, 0];
    } else {
      basis = [0, 0, 1];
    }

    return geomNormalize(
      geomSub(
        basis,
        geomScale(normal, geomDot(basis, normal))
      )
    );
  }

  function geomDot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function geomCross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function geomSub(a, b) {
    return [
      a[0] - b[0],
      a[1] - b[1],
      a[2] - b[2]
    ];
  }

  function geomScale(a, s) {
    return [
      a[0] * s,
      a[1] * s,
      a[2] * s
    ];
  }

  function geomNorm(a) {
    return Math.sqrt(geomDot(a, a));
  }

  function geomNormalize(a) {
    var n = geomNorm(a);

    if (n < 1e-14) {
      return [0, 0, 0];
    }

    return geomScale(a, 1 / n);
  }

  function geomCentroid(points) {
    var c = [0, 0, 0];

    points.forEach(function (p) {
      c[0] += p[0];
      c[1] += p[1];
      c[2] += p[2];
    });

    c[0] /= points.length;
    c[1] /= points.length;
    c[2] /= points.length;

    return c;
  }

  function bestCshm(cshm) {
    var entries = Object.keys(cshm || {}).map(function (key) {
      return [key, cshm[key]];
    }).filter(function (entry) {
      return isFinite(entry[1]);
    });

    entries.sort(function (a, b) {
      return a[1] - b[1];
    });

    return entries[0] || null;
  }

  function shapeName(label) {
    if (typeof IDEAL_SHAPES !== "undefined" && IDEAL_SHAPES[label]) {
      return IDEAL_SHAPES[label].name || "";
    }

    return "";
  }

  function resultSignature(centerLabel, ligands) {
    return centerLabel + "|" + ligands.map(ligandKey).sort().join(";");
  }

  function calculateCurrent(state) {
    var options = ensureGeometryState(state);
    var centerLabel = options.centerAtom;
    var centerAtom = getAtomByLabel(state, centerLabel);

    if (!centerAtom) {
      return;
    }

    var centerCart = makeCartesianAtom(state, centerAtom, "");

    if (!centerCart) {
      return;
    }

    var ligands = findCifBondLigands(state, centerLabel);
    var activeLigands = activeLigandsForCenter(state, centerLabel, ligands);

    var cshm = {};
    var descriptors = {};

    if (
      typeof calcCShM === "function" &&
      activeLigands.length >= 2 &&
      activeLigands.length <= 6
    ) {
      cshm = calcCShM(centerCart, activeLigands);
    }

    if (activeLigands.length >= 2) {
      descriptors = calcDescriptors(centerCart, activeLigands);
    }

    var best = bestCshm(cshm);
    var signature = resultSignature(centerLabel, activeLigands);

    var result = {
      id: "g" + Date.now() + "_" + Math.random().toString(16).slice(2),
      signature: signature,

      centerLabel: centerAtom.label,
      centerElement: normalizeElement(centerAtom.element),

      cn: activeLigands.length,

      ligands: activeLigands.map(function (ligand) {
        return {
          label: ligand.label,
          element: ligand.element,
          distance: ligand.distance,
          cifValue: ligand.cifValue,
          symmetry: ligand.symmetry
        };
      }),

      cshm: cshm,
      bestShape: best ? best[0] : "",
      bestShapeName: best ? shapeName(best[0]) : "",
      bestCshm: best ? best[1] : null,

      descriptors: descriptors
    };

    var existingIndex = -1;

    state.geometryResults.forEach(function (old, index) {
      if (old.signature === signature) {
        existingIndex = index;
      }
    });

    if (existingIndex !== -1) {
      result.id = state.geometryResults[existingIndex].id;
      state.geometryResults[existingIndex] = result;
    } else {
      state.geometryResults.push(result);
    }
  }

  function renderControls(state) {
    var options = ensureGeometryState(state);

    var elements = collectElements(state);
    var selectedElement = setSelectOptions(
      "geom-center-element",
      elements,
      options.centerElement
    );

    options.centerElement = selectedElement;

    var atoms = selectedElement
      ? collectAtomsForElement(state, selectedElement)
      : [];

    var selectedAtom = setSelectOptions(
      "geom-center-atom",
      atoms,
      options.centerAtom
    );

    options.centerAtom = selectedAtom;
  }

  function renderLigands(state) {
    var options = ensureGeometryState(state);
    var centerLabel = options.centerAtom;

    if (!state.hasLoadedCif) {
      setHTML("geom-ligands", "<p class=\"hint\">No CIF loaded.</p>");
      return;
    }

    if (!centerLabel) {
      setHTML("geom-ligands", "<p class=\"hint\">No atom selected.</p>");
      return;
    }

    if (!state.bonds || !state.bonds.length) {
      setHTML("geom-ligands", "<p class=\"hint\">No CIF geometry bond table available.</p>");
      return;
    }

    var ligands = findCifBondLigands(state, centerLabel);

    if (!ligands.length) {
      setHTML("geom-ligands", "<p class=\"hint\">No CIF bond ligands found for the selected atom.</p>");
      return;
    }

    var saved = options.selectedLigandKeysByCenter[centerLabel];

    if (!saved) {
      saved = {};
      ligands.forEach(function (ligand) {
        saved[ligandKey(ligand)] = true;
      });
      options.selectedLigandKeysByCenter[centerLabel] = saved;
    } else {
      ligands.forEach(function (ligand) {
        var key = ligandKey(ligand);

        if (typeof saved[key] !== "boolean") {
          saved[key] = true;
        }
      });
    }

    var rows = ligands.map(function (ligand) {
      var key = ligandKey(ligand);
      var checked = saved[key] !== false;

      return (
        "<tr>" +
          "<td><input type=\"checkbox\" data-geom-ligand=\"" + escapeHtml(key) + "\"" + (checked ? " checked" : "") + "></td>" +
          "<td>" + escapeHtml(ligand.label) + "</td>" +
          "<td class=\"number\">" + escapeHtml(ligand.cifValue || formatNumber(ligand.distance, 4)) + "</td>" +
          "<td>" + escapeHtml(ligand.symmetry) + "</td>" +
        "</tr>"
      );
    }).join("");

    setHTML(
      "geom-ligands",
      "<table class=\"data-table geometry-ligand-table\">" +
        "<thead>" +
          "<tr>" +
            "<th>Use</th>" +
            "<th>Ligand atoms</th>" +
            "<th>Distance /Å</th>" +
            "<th>Symmetry</th>" +
          "</tr>" +
        "</thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>"
    );
  }

  function ligandListText(ligands) {
    return (ligands || []).map(function (ligand) {
      return ligand.label + (ligand.symmetry && ligand.symmetry !== "—" ? " [" + ligand.symmetry + "]" : "");
    }).join(", ");
  }

  function cshmComparisonHtml(result) {
    var cshm = result.cshm || {};
  
    var entries = Object.keys(cshm).map(function (key) {
      return {
        label: key,
        name: shapeName(key),
        value: cshm[key]
      };
    }).filter(function (entry) {
      return isFinite(entry.value);
    });
  
    entries.sort(function (a, b) {
      return a.value - b.value;
    });
  
    if (!entries.length) {
      return "—";
    }
  
    return entries.map(function (entry, index) {
      var text =
        escapeHtml(entry.label) +
        " " +
        formatNumber(entry.value, 4);
  
      var title = entry.name
        ? " title=\"" + escapeHtml(entry.name) + "\""
        : "";
  
      if (index === 0) {
        return "<strong" + title + ">" + text + "</strong>";
      }
  
      return "<span" + title + ">" + text + "</span>";
    }).join("; ");
  }

  function renderResults(state) {
    var results = state.geometryResults || [];
  
    if (!state.hasLoadedCif) {
      setHTML("geom-results", "<p class=\"hint\">Load a CIF file to calculate geometry parameters.</p>");
      return;
    }
  
    if (!results.length) {
      setHTML("geom-results", "<p class=\"hint\">No geometry parameters calculated yet.</p>");
      return;
    }
  
    var rows = results.map(function (result) {
      var d = result.descriptors || {};
  
      return (
        "<tr>" +
          "<td>" + escapeHtml(result.centerLabel) + "</td>" +
          "<td class=\"number\">" + result.cn + "</td>" +
          "<td>" + escapeHtml(ligandListText(result.ligands)) + "</td>" +
          "<td>" + cshmComparisonHtml(result) + "</td>" +
          "<td class=\"number\">" + (isFinite(d["τ₄"]) ? formatNumber(d["τ₄"], 4) : "—") + "</td>" +
          "<td class=\"number\">" + (isFinite(d["τ₄′"]) ? formatNumber(d["τ₄′"], 4) : "—") + "</td>" +
          "<td class=\"number\">" + (isFinite(d["τ₅"]) ? formatNumber(d["τ₅"], 4) : "—") + "</td>" +
          "<td class=\"number\">" + (isFinite(d["V /Å³"]) ? formatNumber(d["V /Å³"], 4) : "—") + "</td>" +
          "<td><button type=\"button\" data-geom-remove=\"" + escapeHtml(result.id) + "\">Remove</button></td>" +
        "</tr>"
      );
    }).join("");
  
    setHTML(
      "geom-results",
      "<table class=\"data-table geometry-results-table\">" +
        "<thead>" +
          "<tr>" +
            "<th>Central atom</th>" +
            "<th>CN</th>" +
            "<th>Ligand atoms</th>" +
            "<th>CShM comparison</th>" +
            "<th>τ₄</th>" +
            "<th>τ₄′</th>" +
            "<th>τ₅</th>" +
            "<th>V /Å³</th>" +
            "<th>Remove</th>" +
          "</tr>" +
        "</thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>"
    );
  }

  CIFLord.GeometryParameters = {
    init: function (state, renderAll) {
      ensureGeometryState(state);

      var elementSelect = $("geom-center-element");
      var atomSelect = $("geom-center-atom");
      var calcButton = $("btn-geom-calculate");
      var clearButton = $("btn-geom-clear");
      var ligandsBox = $("geom-ligands");
      var resultsBox = $("geom-results");

      if (elementSelect) {
        elementSelect.addEventListener("change", function () {
          var options = ensureGeometryState(state);

          options.centerElement = this.value || "";
          options.centerAtom = "";
          renderAll();
        });
      }

      if (atomSelect) {
        atomSelect.addEventListener("change", function () {
          var options = ensureGeometryState(state);

          options.centerAtom = this.value || "";
          renderAll();
        });
      }

      if (ligandsBox) {
        ligandsBox.addEventListener("change", function (event) {
          var input = event.target;

          if (!input.matches("input[type='checkbox'][data-geom-ligand]")) {
            return;
          }

          var options = ensureGeometryState(state);
          var centerLabel = options.centerAtom;
          var key = input.getAttribute("data-geom-ligand");

          if (!centerLabel || !key) {
            return;
          }

          options.selectedLigandKeysByCenter[centerLabel] =
            options.selectedLigandKeysByCenter[centerLabel] || {};

          options.selectedLigandKeysByCenter[centerLabel][key] = input.checked;
          renderAll();
        });
      }

      if (calcButton) {
        calcButton.addEventListener("click", function () {
          calculateCurrent(state);
          renderAll();
        });
      }

      if (clearButton) {
        clearButton.addEventListener("click", function () {
          state.geometryResults = [];
          renderAll();
        });
      }

      if (resultsBox) {
        resultsBox.addEventListener("click", function (event) {
          var button = event.target;

          if (!button.matches("button[data-geom-remove]")) {
            return;
          }

          var id = button.getAttribute("data-geom-remove");

          state.geometryResults = (state.geometryResults || []).filter(function (result) {
            return result.id !== id;
          });

          renderAll();
        });
      }
    },

    render: function (state) {
      ensureGeometryState(state);

      if (!state.hasLoadedCif) {
        setHTML("geom-ligands", "<p class=\"hint\">No CIF loaded.</p>");
        setHTML("geom-results", "<p class=\"hint\">Load a CIF file to calculate geometry parameters.</p>");
        return;
      }

      renderControls(state);
      renderLigands(state);
      renderResults(state);
    }
  };
})();
