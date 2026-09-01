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

  function formatValueWithEsd(value, esd, maxDecimals) {
    if (!isFinite(value)) {
      return "—";
    }

    if (!isFinite(esd) || esd <= 0) {
      return Number(value).toFixed(maxDecimals);
    }

    var exp = Math.floor(Math.log10(esd));
    var decimals = Math.max(0, Math.min(6, -exp + 1));
    var esdDigits = Math.round(esd * Math.pow(10, decimals));

    return Number(value).toFixed(decimals) + "(" + esdDigits + ")";
  }

  function formatNumber(value, digits) {
    var n = Number(value);

    if (!isFinite(n)) {
      return "—";
    }

    return n.toFixed(digits);
  }

  /*
    --- state -----------------------------------------------------------
  */

  function ensureRingState(state) {
    state.ringOptions = state.ringOptions || {
      centerElement: "",
      centerAtom: "",
      reverseByKey: {}
    };

    state.ringOptions.reverseByKey = state.ringOptions.reverseByKey || {};

    state.ringResults = state.ringResults || [];

    return state.ringOptions;
  }

  /*
    --- shared small helpers (duplicated locally, same convention as the
    other tab modules in this app) --------------------------------------
  */

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

  function isHydrogen(element) {
    return normalizeElement(element) === "H" || normalizeElement(element) === "D";
  }

  function getAtomByLabel(state, label) {
    return (state.atoms || []).find(function (atom) {
      return atom.label === label;
    }) || null;
  }

  function atomOrderIndex(state, label) {
    var atoms = state.atoms || [];

    for (var i = 0; i < atoms.length; i++) {
      if (atoms[i].label === label) {
        return i;
      }
    }

    return Number.MAX_SAFE_INTEGER;
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
    component = String(component || "").replace(/\s+/g, "").toLowerCase();

    var result = { x: 0, y: 0, z: 0, c: 0 };

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
    operation = String(operation || "x,y,z").replace(/^['"]|['"]$/g, "");

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
      return { opId: "1", translation: "555" };
    }

    var parts = code.split("_");

    if (parts.length === 2) {
      return { opId: parts[0], translation: parts[1] || "555" };
    }

    if (/^\d{3}$/.test(code)) {
      return { opId: "1", translation: code };
    }

    return { opId: parts[0] || "1", translation: "555" };
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
      return comp.x * atom.x + comp.y * atom.y + comp.z * atom.z + comp.c + offset;
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

  // Rings that close via a symmetry operation (e.g. a chelate ring
  // completed through a crystallographic axis, as with a metal sitting
  // on a special position) are supported: any bond's site symmetry code
  // can be applied to bring an atom to its bonded position.
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
      frac = { x: Number(atom.x), y: Number(atom.y), z: Number(atom.z) };
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
      x: cart[0],
      y: cart[1],
      z: cart[2]
    };
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

    var current = preferred || "";

    if (values.indexOf(current) === -1) {
      current = values[0];
    }

    el.innerHTML = values.map(function (value) {
      return "<option value=\"" + escapeHtml(value) + "\">" + escapeHtml(value) + "</option>";
    }).join("");

    el.value = current;

    return current;
  }

  /*
    --- connectivity graph + ring search ---------------------------------
    Direction convention: the selected atom is always the ring's starting
    point (position 0). Between the two possible traversal directions
    around the ring, the canonical (non-reversed) one is chosen the same
    way PLATON's own ring search (PLA078) canonicalises duplicate ring
    windings: by atom index rather than by any 3D handedness, i.e. the
    direction is picked so that the second ring atom has a lower/equal
    atom-list index than the second-to-last one (ties broken by the
    symmetry code string, for determinism). The "Reverse order" checkbox
    flips this canonical direction for the final calculation.

    Rings that close via a symmetry operation (e.g. a chelate ring around
    a metal on a special position, completed through a crystallographic
    axis) are found too: rather than symbolically composing symmetry
    operators along the path (error-prone once more than one non-identity
    hop is involved), every non-hydrogen asymmetric-unit atom is expanded
    by every site-symmetry code that appears anywhere in the CIF bond
    table, and connectivity between these expanded copies is reconstructed
    by matching real Cartesian distances against the known CIF bond
    distances for that atom-label pair — the same distance-based bond
    perception real crystallographic software uses, sidestepping symmetry
    operator composition/inversion entirely.
  */

  var BOND_DISTANCE_TOLERANCE = 0.05;

  function collectSymCodes(state) {
    var seen = { "": true };
    var codes = [""];

    (state.bonds || []).forEach(function (bond) {
      [bond.sym1Code, bond.sym2Code].forEach(function (code) {
        var key = isIdentitySymCode(code) ? "" : String(code || "").trim();

        if (!seen[key]) {
          seen[key] = true;
          codes.push(key);
        }
      });
    });

    return codes;
  }

  function buildAsuBondFacts(state) {
    var facts = {};

    function add(a, b, distance) {
      facts[a] = facts[a] || [];
      facts[a].push({ other: b, distance: distance });
    }

    (state.bonds || []).forEach(function (bond) {
      var atomA = getAtomByLabel(state, bond.atom1Label);
      var atomB = getAtomByLabel(state, bond.atom2Label);

      if (!atomA || !atomB || isHydrogen(atomA.element) || isHydrogen(atomB.element)) {
        return;
      }

      var d = Number(bond.numericalValue);

      if (!isFinite(d) || d <= 0) {
        return;
      }

      add(bond.atom1Label, bond.atom2Label, d);
      add(bond.atom2Label, bond.atom1Label, d);
    });

    return facts;
  }

  function buildExpandedNodes(state, symCodes) {
    var heavyAtoms = (state.atoms || []).filter(function (atom) {
      return !isHydrogen(atom.element);
    });

    var nodes = [];
    var seenByLabel = {};

    heavyAtoms.forEach(function (atom) {
      seenByLabel[atom.label] = [];

      symCodes.forEach(function (code) {
        var cart = makeCartesianAtom(state, atom, code);

        if (!cart) {
          return;
        }

        var dup = seenByLabel[atom.label].some(function (existing) {
          return (
            Math.abs(existing.x - cart.x) < 1e-4 &&
            Math.abs(existing.y - cart.y) < 1e-4 &&
            Math.abs(existing.z - cart.z) < 1e-4
          );
        });

        if (dup) {
          return;
        }

        seenByLabel[atom.label].push(cart);

        nodes.push({
          key: atom.label + "@" + code,
          label: atom.label,
          code: code,
          x: cart.x,
          y: cart.y,
          z: cart.z,
          variance: computeAtomVarianceCart(state, atom, code)
        });
      });
    });

    return nodes;
  }

  function buildExpandedAdjacency(nodes, asuBondFacts) {
    var adjacency = {};
    var byKey = {};

    nodes.forEach(function (node) {
      adjacency[node.key] = [];
      byKey[node.key] = node;
    });

    for (var i = 0; i < nodes.length; i++) {
      var n1 = nodes[i];
      var candidates = asuBondFacts[n1.label] || [];

      if (!candidates.length) {
        continue;
      }

      for (var j = 0; j < nodes.length; j++) {
        if (i === j) {
          continue;
        }

        var n2 = nodes[j];

        var match = candidates.some(function (c) {
          return c.other === n2.label;
        });

        if (!match) {
          continue;
        }

        var dx = n1.x - n2.x;
        var dy = n1.y - n2.y;
        var dz = n1.z - n2.z;
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        var distOk = candidates.some(function (c) {
          return c.other === n2.label && Math.abs(c.distance - dist) <= BOND_DISTANCE_TOLERANCE;
        });

        if (distOk) {
          adjacency[n1.key].push(n2.key);
        }
      }
    }

    return { adjacency: adjacency, byKey: byKey };
  }

  function findCyclesOfSize(graph, startKey, size) {
    var cycles = [];
    var visited = {};
    var startLabel = (graph.byKey[startKey] || {}).label;

    visited[startKey] = true;

    function dfs(path) {
      var current = path[path.length - 1];

      if (path.length === size) {
        if ((graph.adjacency[current] || []).indexOf(startKey) !== -1) {
          cycles.push(path.slice());
        }
        return;
      }

      (graph.adjacency[current] || []).forEach(function (next) {
        if (visited[next]) {
          return;
        }

        // Never re-enter the starting label mid-path: a different
        // symmetry copy of the same atom label here would be a
        // physically different atom (e.g. a neighbouring metal centre),
        // and passing through it isn't a ring around the selected atom.
        if ((graph.byKey[next] || {}).label === startLabel) {
          return;
        }

        visited[next] = true;
        path.push(next);
        dfs(path);
        path.pop();
        visited[next] = false;
      });
    }

    dfs([startKey]);

    return cycles;
  }

  function nodeSortKey(state, node) {
    var idx = atomOrderIndex(state, node.label);
    return (idx < 10 ? "0" + idx : idx) + "|" + node.code;
  }

  function canonicalizeDirection(state, cyclePath) {
    var n = cyclePath.length;
    var second = cyclePath[1];
    var secondLast = cyclePath[n - 1];

    if (nodeSortKey(state, second) <= nodeSortKey(state, secondLast)) {
      return cyclePath.slice();
    }

    return [cyclePath[0]].concat(cyclePath.slice(1).reverse());
  }

  function detectRings(state, startLabel) {
    if (!startLabel) {
      return [];
    }

    var startAtom = getAtomByLabel(state, startLabel);

    if (!startAtom) {
      return [];
    }

    var symCodes = collectSymCodes(state);
    var asuBondFacts = buildAsuBondFacts(state);
    var nodes = buildExpandedNodes(state, symCodes);
    var graph = buildExpandedAdjacency(nodes, asuBondFacts);

    var startKey = startLabel + "@";

    if (!graph.adjacency[startKey]) {
      return [];
    }

    var seen = {};
    var rings = [];

    [5, 6].forEach(function (size) {
      findCyclesOfSize(graph, startKey, size).forEach(function (cycleKeys) {
        var cyclePath = cycleKeys.map(function (key) {
          return graph.byKey[key];
        });

        var canonical = canonicalizeDirection(state, cyclePath);
        var key = canonical.map(function (n) { return n.key; }).join(">");

        if (seen[key]) {
          return;
        }

        seen[key] = true;

        rings.push({
          key: key,
          size: size,
          atoms: canonical
        });
      });
    });

    rings.sort(function (a, b) {
      return a.size - b.size || a.key.localeCompare(b.key);
    });

    return rings;
  }

  /*
    --- Cremer-Pople ring puckering --------------------------------------
    Reference: Cremer, D.; Pople, J. A. J. Am. Chem. Soc. 1975, 97, 1354-1358.
    `atoms` must be Cartesian coordinates in ring connectivity order
    (closed loop). N must be 5 or 6.
  */

  function cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }

  // Isotropic Cartesian position variance for an atom transformed by a
  // (possibly non-identity) symmetry code, from its fractional ESDs.
  // Used to propagate ESDs through the ring puckering parameters,
  // following the same approach as PLATON's PLA095 (which in turn cites
  // Norrestam, Acta Cryst. 1981, A37, 764-765): the position esd of atom
  // j contributes an isotropic variance sigma_j^2 to its out-of-plane
  // displacement, averaged over the three Cartesian directions since the
  // esd's covariance structure (only x/y/z esds, no cross terms) is not
  // available from the CIF.
  function computeAtomVarianceCart(state, atom, symCode) {
    var cell = state.cell;
    var M = orthMatrix(cell);

    var R;

    if (isIdentitySymCode(symCode)) {
      R = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    } else {
      var parsedCode = parseSymCode(symCode);
      var operation = getSymOperation(state, parsedCode.opId);
      var symParsed = parseSymOperation(operation);

      R = [
        [symParsed[0].x, symParsed[0].y, symParsed[0].z],
        [symParsed[1].x, symParsed[1].y, symParsed[1].z],
        [symParsed[2].x, symParsed[2].y, symParsed[2].z]
      ];
    }

    var A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];

    for (var i = 0; i < 3; i++) {
      for (var k = 0; k < 3; k++) {
        var sum = 0;

        for (var m = 0; m < 3; m++) {
          sum += M[i][m] * R[m][k];
        }

        A[i][k] = sum;
      }
    }

    var colNormSq = [0, 0, 0];

    for (var k2 = 0; k2 < 3; k2++) {
      var s2 = 0;

      for (var i2 = 0; i2 < 3; i2++) {
        s2 += A[i2][k2] * A[i2][k2];
      }

      colNormSq[k2] = s2;
    }

    var xEsd = Number(atom.xEsd) || 0;
    var yEsd = Number(atom.yEsd) || 0;
    var zEsd = Number(atom.zEsd) || 0;

    var trace =
      xEsd * xEsd * colNormSq[0] +
      yEsd * yEsd * colNormSq[1] +
      zEsd * zEsd * colNormSq[2];

    return trace / 3;
  }

  function calcRingPucker(atoms) {
    var N = atoms.length;

    if (N !== 5 && N !== 6) {
      return null;
    }

    var cx = atoms.reduce(function (s, a) { return s + a.x; }, 0) / N;
    var cy = atoms.reduce(function (s, a) { return s + a.y; }, 0) / N;
    var cz = atoms.reduce(function (s, a) { return s + a.z; }, 0) / N;

    var R = atoms.map(function (a) {
      return { x: a.x - cx, y: a.y - cy, z: a.z - cz };
    });

    var Rp = { x: 0, y: 0, z: 0 };
    var Rpp = { x: 0, y: 0, z: 0 };

    for (var i = 0; i < N; i++) {
      var s = Math.sin(2 * Math.PI * i / N);
      var c = Math.cos(2 * Math.PI * i / N);

      Rp.x += R[i].x * s; Rp.y += R[i].y * s; Rp.z += R[i].z * s;
      Rpp.x += R[i].x * c; Rpp.y += R[i].y * c; Rpp.z += R[i].z * c;
    }

    var n = cross(Rp, Rpp);
    var nLen = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);

    if (nLen < 1e-10) {
      return null;
    }

    n = { x: n.x / nLen, y: n.y / nLen, z: n.z / nLen };

    var z = R.map(function (r) {
      return r.x * n.x + r.y * n.y + r.z * n.z;
    });

    var sumCos = 0, sumSin = 0;

    for (var j = 0; j < N; j++) {
      sumCos += z[j] * Math.cos(2 * Math.PI * 2 * j / N);
      sumSin += z[j] * Math.sin(2 * Math.PI * 2 * j / N);
    }

    var q2cos = Math.sqrt(2 / N) * sumCos;
    var q2sin = -Math.sqrt(2 / N) * sumSin;
    var q2 = Math.sqrt(q2cos * q2cos + q2sin * q2sin);
    var phi2 = Math.atan2(q2sin, q2cos) * 180 / Math.PI;

    if (phi2 < 0) phi2 += 360;

    // ESD propagation (Norrestam, Acta Cryst. 1981, A37, 764-765, as
    // used by PLATON's PLA095): each ring atom's isotropic Cartesian
    // position variance sigma_j^2 propagates linearly through the same
    // trigonometric sums used for q2/phi2 (and, for six-membered rings,
    // the alternating sum used for q3), then combines into Q and theta.
    var variances = atoms.map(function (a) { return Number(a.variance) || 0; });

    var cqVar2 = 0, sqVar2 = 0;

    for (var vi = 0; vi < N; vi++) {
      var cv = Math.cos(2 * Math.PI * 2 * vi / N);
      var sv = Math.sin(2 * Math.PI * 2 * vi / N);

      cqVar2 += variances[vi] * cv * cv;
      sqVar2 += variances[vi] * sv * sv;
    }

    cqVar2 *= 2 / N;
    sqVar2 *= 2 / N;

    var cos2 = q2 > 1e-12 ? q2cos / q2 : 0;
    var sin2 = q2 > 1e-12 ? q2sin / q2 : 0;

    var q2Esd = q2 > 1e-12
      ? Math.sqrt(Math.abs(cqVar2 * cos2 * cos2 + sqVar2 * sin2 * sin2))
      : 0;

    var phi2Esd = q2 > 1e-12
      ? Math.sqrt(Math.abs(cqVar2 * sin2 * sin2 + sqVar2 * cos2 * cos2)) * 180 / Math.PI / q2
      : 0;

    var result = {
      N: N,
      centroid: { x: cx, y: cy, z: cz },
      normal: n,
      zDisplacements: z,
      q2: q2,
      phi2: phi2,
      q2Esd: q2Esd,
      phi2Esd: phi2Esd
    };

    if (N === 6) {
      var sumAlt = 0;

      for (var k = 0; k < N; k++) {
        sumAlt += z[k] * Math.cos(Math.PI * k);
      }

      var q3 = sumAlt / Math.sqrt(N);
      var Q = Math.sqrt(q2 * q2 + q3 * q3);
      var theta = Q > 1e-12
        ? Math.acos(Math.max(-1, Math.min(1, q3 / Q))) * 180 / Math.PI
        : 0;

      var altVar = 0;

      for (var vk = 0; vk < N; vk++) {
        altVar += variances[vk];
      }

      altVar /= N;

      var q3Esd = Math.sqrt(altVar);

      var totalVar = 0;

      for (var vj = 0; vj < N; vj++) {
        totalVar += z[vj] * z[vj] * variances[vj];
      }

      var QEsd = Q > 1e-12 ? Math.sqrt(totalVar) / Q : 0;

      var csth = Q > 1e-12 ? q3 / Q : 0;

      var thetaEsd = Q > 1e-12
        ? Math.sqrt(Math.abs((q2Esd * q2Esd - q3Esd * q3Esd) * csth * csth + q3Esd * q3Esd)) * 180 / Math.PI / Q
        : 0;

      result.q3 = q3;
      result.Q = Q;
      result.theta = theta;
      result.q3Esd = q3Esd;
      result.QEsd = QEsd;
      result.thetaEsd = thetaEsd;
      result.classification = Q < 0.05
        ? { family: "Planar", symbol: "—", approximate: false }
        : classifyHexagonPucker(theta, phi2);
    } else {
      result.Q = q2;
      result.QEsd = q2Esd;
      result.classification = q2 < 0.05
        ? { family: "Planar", symbol: "—", approximate: false }
        : classifyPentagonPucker(phi2);
    }

    return result;
  }

  // Same 45deg/60deg-band approximation used in advanced_xyz2tab; see the
  // note in that module about why this stops at the general family name
  // (Chair/Boat/Twist-boat/Envelope/Half-chair) instead of an atom-indexed
  // IUPAC symbol such as "4C1" — that requires a fixed reference-atom
  // numbering a generic ring-search tool cannot assume. This general
  // classification, unlike phi2 itself, does not depend on ring
  // traversal direction.
  // Reference theta values (Boeyens, J. Cryst. Mol. Struct. 8, (1978),
  // 317-320 — the same values PLATON's PLA095 lists) rather than
  // symmetric 45deg quadrants: Chair 0/180, Half-Chair 50.8 (twist
  // phase), Envelope 54.7 (boat phase), Twist-Boat 67.5 (twist phase),
  // Boat 90 (boat phase). theta is folded to its 0-90 equivalent since
  // the reference set is symmetric about theta=90.
  function classifyHexagonPucker(theta, phi) {
    phi = ((phi % 360) + 360) % 360;

    function distToPhase(target) {
      var d = Math.abs(phi - target) % 360;
      return Math.min(d, 360 - d);
    }

    var boatPhaseDist = Infinity;
    var twistPhaseDist = Infinity;

    for (var k = 0; k < 6; k++) {
      boatPhaseDist = Math.min(boatPhaseDist, distToPhase(k * 60));
      twistPhaseDist = Math.min(twistPhaseDist, distToPhase(30 + k * 60));
    }

    var isBoatPhase = boatPhaseDist <= twistPhaseDist;
    var thetaEff = theta <= 90 ? theta : 180 - theta;
    var family, symbol;

    if (isBoatPhase) {
      if (thetaEff < 27.35) {
        family = "Chair"; symbol = "C";
      } else if (thetaEff < 72.35) {
        family = "Envelope"; symbol = "E";
      } else {
        family = "Boat"; symbol = "B";
      }
    } else {
      if (thetaEff < 25.4) {
        family = "Chair"; symbol = "C";
      } else if (thetaEff < 59.15) {
        family = "Half-Chair"; symbol = "H";
      } else {
        family = "Twist-Boat"; symbol = "S";
      }
    }

    return { family: family, symbol: symbol, approximate: false };
  }

  function classifyPentagonPucker(phi) {
    phi = ((phi % 360) + 360) % 360;

    function distToPhase(target) {
      var d = Math.abs(phi - target) % 360;
      return Math.min(d, 360 - d);
    }

    var envelopeDist = Infinity;
    var twistDist = Infinity;

    for (var k = 0; k < 10; k++) {
      envelopeDist = Math.min(envelopeDist, distToPhase(k * 36));
      twistDist = Math.min(twistDist, distToPhase(18 + k * 36));
    }

    var isEnvelope = envelopeDist <= twistDist;

    return {
      family: isEnvelope ? "Envelope" : "Twist",
      symbol: isEnvelope ? "E" : "T",
      approximate: false
    };
  }

  /*
    --- Evans & Boeyens conformational decomposition ---------------------
    Reference: D. G. Evans, J. C. A. Boeyens, "Conformational Analysis of
    Ring Pucker", Acta Cryst. (1989), B45, 581-590.

    This is a DIFFERENT, complementary description from the
    classify*Pucker() functions above (used for the "Conformation"
    column). Those snap the ring to the single nearest named family on a
    fixed grid. This one does not snap: it expresses the ring's actual
    (q2, phi2[, q3]) exactly as a normalised linear combination of the
    two (or three) nearest primitive symmetric forms, e.g. "91.6% Chair +
    7.3% Boat (phi=180 deg) + 1.1% Twist-Boat (phi=210 deg)" — the same
    approach as PLATON's PLA218-PLA225 (dispatch: PLA219 for 6-rings,
    PLA221 for 5-rings; coefficient solve PLA222; nearest-phase search
    PLA224/PLA225), re-derived from the paper's own equations (p. 589)
    rather than transcribed from the Fortran control flow.
  */

  function boeyensNearestPhase(phi, offsetDeg, stepDeg, kCount) {
    phi = ((phi % 360) + 360) % 360;

    var best = offsetDeg;
    var bestDist = Infinity;

    for (var k = 0; k < kCount; k++) {
      var angle = offsetDeg + k * stepDeg;
      var raw = Math.abs(phi - angle) % 360;
      var d = Math.min(raw, 360 - raw);

      if (d < bestDist) {
        bestDist = d;
        best = angle;
      }
    }

    return best;
  }

  // Coefficients of the two primitive forms at phase angles A and B that
  // bracket the ring's actual phase, given the ring's Em-mode amplitude
  // q (q2 for both 5- and 6-membered rings): XA = q*sin(phi-B)/sin(A-B),
  // XB = q*sin(A-phi)/sin(A-B).
  function boeyensCoeffs(q, phi, A, B) {
    function rad(d) { return d * Math.PI / 180; }

    var R = rad(phi), Ar = rad(A), Br = rad(B);
    var w = Math.sin(Ar - Br);

    if (Math.abs(w) < 1e-10) {
      return null;
    }

    return {
      xa: Math.max(0, q * Math.sin(R - Br) / w),
      xb: Math.max(0, q * Math.sin(Ar - R) / w)
    };
  }

  // 6-ring: Chair (B2u mode, amplitude |q3|) + nearest Boat/Twist-Boat
  // pair (Em mode, amplitude q2).
  function boeyensDecompose6(pucker) {
    if (!pucker || pucker.N !== 6) {
      return null;
    }

    if (pucker.classification && pucker.classification.family === "Planar") {
      return null;
    }

    var q2 = pucker.q2, phi2 = pucker.phi2, q3 = pucker.q3;

    var A = boeyensNearestPhase(phi2, 0, 60, 6);
    var B = boeyensNearestPhase(phi2, 30, 60, 6);

    var coeffs = boeyensCoeffs(q2, phi2, A, B);

    if (!coeffs) {
      return null;
    }

    var v = Math.abs(q3);
    var total = coeffs.xa + coeffs.xb + v;

    if (total < 1e-8) {
      return null;
    }

    return {
      N: 6,
      chair: { fraction: v / total, sign: q3 >= 0 ? 1 : -1 },
      boat: { fraction: coeffs.xa / total, phase: A },
      twistBoat: { fraction: coeffs.xb / total, phase: B }
    };
  }

  // 5-ring: nearest Envelope/Twist pair only (no B2u term — it only
  // exists for even N).
  function boeyensDecompose5(pucker) {
    if (!pucker || pucker.N !== 5) {
      return null;
    }

    if (pucker.classification && pucker.classification.family === "Planar") {
      return null;
    }

    var q2 = pucker.q2, phi2 = pucker.phi2;

    var A = boeyensNearestPhase(phi2, 0, 36, 10);
    var B = boeyensNearestPhase(phi2, 18, 36, 10);

    var coeffs = boeyensCoeffs(q2, phi2, A, B);

    if (!coeffs) {
      return null;
    }

    var total = coeffs.xa + coeffs.xb;

    if (total < 1e-8) {
      return null;
    }

    return {
      N: 5,
      envelope: { fraction: coeffs.xa / total, phase: A },
      twist: { fraction: coeffs.xb / total, phase: B }
    };
  }

  function boeyensDecomposition(pucker) {
    if (!pucker) {
      return null;
    }

    if (pucker.N === 6) {
      return boeyensDecompose6(pucker);
    }

    if (pucker.N === 5) {
      return boeyensDecompose5(pucker);
    }

    return null;
  }

  function boeyensDecompositionLabel(decomp) {
    if (!decomp) {
      return "—";
    }

    function pct(f) { return (f * 100).toFixed(1); }

    if (decomp.N === 6) {
      var chairNote = decomp.chair.sign < 0 ? ", inverted" : "";

      return (
        pct(decomp.chair.fraction) + "% Chair" + chairNote + " + " +
        pct(decomp.boat.fraction) + "% Boat (φ=" + decomp.boat.phase + "°) + " +
        pct(decomp.twistBoat.fraction) + "% Twist-Boat (φ=" + decomp.twistBoat.phase + "°)"
      );
    }

    return (
      pct(decomp.envelope.fraction) + "% Envelope (φ=" + decomp.envelope.phase + "°) + " +
      pct(decomp.twist.fraction) + "% Twist (φ=" + decomp.twist.phase + "°)"
    );
  }

  function conformationLabel(result) {
    if (!result.classification) {
      return "—";
    }

    var c = result.classification;

    if (c.family === "Planar") {
      return "Planar";
    }

    return c.family + " (" + c.symbol + ")" + (c.approximate ? " (approx.)" : "");
  }

  /*
    --- rendering ---------------------------------------------------------
  */

  function isPrimeSymmetrySymbol(symbol) {
    return symbol === "'" || symbol === "''" || symbol === "'''";
  }

  function symSupLocal(symbol) {
    if (!symbol) {
      return "";
    }

    if (isPrimeSymmetrySymbol(symbol)) {
      return symbol;
    }

    return "<sup>" + symbol + "</sup>";
  }

  function symTextLocal(symbol) {
    if (!symbol) {
      return "";
    }

    if (isPrimeSymmetrySymbol(symbol)) {
      return symbol;
    }

    return "^" + symbol;
  }

  // Symmetry codes are displayed using the same convention as the rest
  // of the report (', '', ''' for the first three distinct codes
  // encountered anywhere in the CIF, roman numerals for any further
  // ones) rather than the raw CIF code, via the symbol table already
  // built for the bond/angle/hbond tables during parsing.
  function findSymmetrySymbol(state, code) {
    if (isIdentitySymCode(code)) {
      return "";
    }

    var note = (state.symmetryNotes || []).find(function (n) {
      return n.code === code;
    });

    return note ? note.symbol : code;
  }

  function nodeDisplayHtml(state, node) {
    var symbol = findSymmetrySymbol(state, node.code);
    return escapeHtml(node.label) + symSupLocal(symbol);
  }

  function nodeDisplayText(state, node) {
    var symbol = findSymmetrySymbol(state, node.code);
    return node.label + symTextLocal(symbol);
  }

  function ringLabelHtml(state, nodes) {
    return nodes.map(function (node) {
      return nodeDisplayHtml(state, node);
    }).join(" – ");
  }

  // Distinct non-identity symmetry symbols actually used by a ring's atoms,
  // for scoping the report's ring-table symmetry footnote to what is really
  // shown (rather than every symmetry code present anywhere in the CIF).
  function ringSymmetrySymbols(state, nodes) {
    var seen = {};
    var symbols = [];

    nodes.forEach(function (node) {
      var symbol = findSymmetrySymbol(state, node.code);

      if (symbol && !seen[symbol]) {
        seen[symbol] = true;
        symbols.push(symbol);
      }
    });

    return symbols;
  }

  function unitLabel(state, label, unit) {
    var si = !!(state.reportOptions && state.reportOptions.siUnits);
    return si ? label + " /" + unit : label + " [" + unit + "]";
  }

  function symmetryOperationHtmlLocal(operation) {
    return escapeHtml(operation || "").replace(/\b([XYZxyz])\b/g, function (m) {
      return "<em>" + m.toLowerCase() + "</em>";
    });
  }

  function renderRingSymmetryNotes(state, rings) {
    var box = $("ring-symmetry-notes");

    if (!box) {
      return;
    }

    var codes = {};

    (rings || []).forEach(function (ring) {
      (ring.atoms || []).forEach(function (node) {
        if (node.code && !isIdentitySymCode(node.code)) {
          codes[node.code] = true;
        }
      });
    });

    var notes = (state.symmetryNotes || []).filter(function (n) {
      return codes[n.code];
    });

    if (!notes.length) {
      box.innerHTML = "";
      return;
    }

    var label = notes.length === 1
      ? "Symmetry transformation used to generate equivalent atoms:"
      : "Symmetry transformations used to generate equivalent atoms:";

    box.innerHTML =
      "<h3>Symmetry</h3>" +
      "<p class=\"hint\"><strong>" + escapeHtml(label) + "</strong> " +
      notes.map(function (note) {
        return "(" + escapeHtml(note.symbol) + ") " + symmetryOperationHtmlLocal(note.operation || note.code || "");
      }).join("; ") +
      ".</p>";
  }

  function renderControls(state) {
    var options = ensureRingState(state);

    var elements = collectElements(state);
    var selectedElement = setSelectOptions("ring-select-element", elements, options.centerElement);
    options.centerElement = selectedElement;

    var atoms = selectedElement ? collectAtomsForElement(state, selectedElement) : [];
    var selectedAtom = setSelectOptions("ring-select-atom", atoms, options.centerAtom);
    options.centerAtom = selectedAtom;
  }

  function renderDetected(state) {
    var options = ensureRingState(state);
    var centerLabel = options.centerAtom;

    if (!state.hasLoadedCif) {
      setHTML("ring-detected-list", "<p class=\"hint\">No CIF loaded.</p>");
      renderRingSymmetryNotes(state, []);
      return;
    }

    if (!centerLabel) {
      setHTML("ring-detected-list", "<p class=\"hint\">No atom selected.</p>");
      renderRingSymmetryNotes(state, []);
      return;
    }

    if (!state.bonds || !state.bonds.length) {
      setHTML("ring-detected-list", "<p class=\"hint\">No CIF geometry bond table available.</p>");
      renderRingSymmetryNotes(state, []);
      return;
    }

    var rings = detectRings(state, centerLabel);

    if (!rings.length) {
      setHTML(
        "ring-detected-list",
        "<p class=\"hint\">No 5- or 6-membered ring found through " + escapeHtml(centerLabel) + ".</p>"
      );
      renderRingSymmetryNotes(state, []);
      return;
    }

    var rows = rings.map(function (ring) {
      var reversed = !!options.reverseByKey[ring.key];

      return (
        "<tr>" +
          "<td>" + ring.size + "</td>" +
          "<td>" + ringLabelHtml(state, ring.atoms) + "</td>" +
          "<td class=\"checkbox-cell\">" +
            "<label class=\"checkbox-row\">" +
              "<input type=\"checkbox\" data-ring-reverse=\"" + escapeHtml(ring.key) + "\"" +
                (reversed ? " checked" : "") + ">" +
              " Reverse order" +
            "</label>" +
          "</td>" +
        "</tr>"
      );
    }).join("");

    setHTML(
      "ring-detected-list",
      "<table class=\"data-table\">" +
        "<thead>" +
          "<tr>" +
            "<th>Size</th>" +
            "<th>Ring atoms (starting at " + escapeHtml(centerLabel) + ")</th>" +
            "<th>Direction</th>" +
          "</tr>" +
        "</thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>"
    );

    renderRingSymmetryNotes(state, rings);
  }

  function renderResults(state) {
    var results = state.ringResults || [];

    if (!state.hasLoadedCif) {
      setHTML("ring-results", "<p class=\"hint\">Load a CIF file to calculate ring parameters.</p>");
      return;
    }

    if (!results.length) {
      setHTML("ring-results", "<p class=\"hint\">No ring parameters calculated yet.</p>");
      return;
    }

    var rows = results.map(function (result) {
      return (
        "<tr>" +
          "<td>" + result.atomsHtml + (result.reversed ? " <span class=\"hint\">(reversed)</span>" : "") + "</td>" +
          "<td class=\"number\">" + result.N + "</td>" +
          "<td class=\"number\">" + formatValueWithEsd(result.Q, result.QEsd, 4) + "</td>" +
          "<td class=\"number\">" + (result.N === 6 ? formatValueWithEsd(result.theta, result.thetaEsd, 2) : "—") + "</td>" +
          "<td class=\"number\">" + formatValueWithEsd(result.phi2, result.phi2Esd, 2) + "</td>" +
          "<td class=\"number\">" + formatValueWithEsd(result.q2, result.q2Esd, 4) + "</td>" +
          "<td class=\"number\">" + (result.N === 6 ? formatValueWithEsd(result.q3, result.q3Esd, 4) : "—") + "</td>" +
          "<td>" + escapeHtml(conformationLabel(result)) + "</td>" +
          "<td>" + escapeHtml(boeyensDecompositionLabel(result.boeyens)) + "</td>" +
          "<td><button type=\"button\" data-ring-remove=\"" + escapeHtml(result.id) + "\">Remove</button></td>" +
        "</tr>"
      );
    }).join("");

    setHTML(
      "ring-results",
      "<table class=\"data-table ring-results-table\">" +
        "<thead>" +
          "<tr>" +
            "<th>Ring atoms</th>" +
            "<th>N</th>" +
            "<th>" + unitLabel(state, "Q", "Å") + "</th>" +
            "<th>" + unitLabel(state, "θ", "°") + "</th>" +
            "<th>" + unitLabel(state, "φ₂", "°") + "</th>" +
            "<th>" + unitLabel(state, "q₂", "Å") + "</th>" +
            "<th>" + unitLabel(state, "q₃", "Å") + "</th>" +
            "<th>Conformation</th>" +
            "<th>Evans-Boeyens decomposition</th>" +
            "<th>Remove</th>" +
          "</tr>" +
        "</thead>" +
        "<tbody>" + rows + "</tbody>" +
      "</table>"
    );
  }

  function calculateCurrent(state) {
    var options = ensureRingState(state);
    var centerLabel = options.centerAtom;

    if (!centerLabel || !state.bonds || !state.bonds.length) {
      return;
    }

    var rings = detectRings(state, centerLabel);

    rings.forEach(function (ring) {
      var reversed = !!options.reverseByKey[ring.key];

      var orderedNodes = reversed
        ? [ring.atoms[0]].concat(ring.atoms.slice(1).reverse())
        : ring.atoms.slice();

      var pucker = calcRingPucker(orderedNodes);

      if (!pucker) {
        return;
      }

      var signature = ring.key + "|" + (reversed ? "rev" : "fwd");

      var result = {
        id: signature,
        signature: signature,
        centerLabel: centerLabel,
        atomsHtml: ringLabelHtml(state, orderedNodes),
        symmetrySymbols: ringSymmetrySymbols(state, orderedNodes),
        reversed: reversed,
        N: pucker.N,
        Q: pucker.Q,
        QEsd: pucker.QEsd,
        q2: pucker.q2,
        q2Esd: pucker.q2Esd,
        phi2: pucker.phi2,
        phi2Esd: pucker.phi2Esd,
        q3: pucker.q3,
        q3Esd: pucker.q3Esd,
        theta: pucker.theta,
        thetaEsd: pucker.thetaEsd,
        classification: pucker.classification,
        boeyens: boeyensDecomposition(pucker),
        centroid: pucker.centroid,
        normal: pucker.normal,
        zDisplacements: pucker.zDisplacements
      };

      var existingIndex = -1;

      state.ringResults.forEach(function (old, index) {
        if (old.signature === signature) {
          existingIndex = index;
        }
      });

      if (existingIndex !== -1) {
        state.ringResults[existingIndex] = result;
      } else {
        state.ringResults.push(result);
      }
    });
  }

  CIFLord.Rings = {
    init: function (state, renderAll) {
      ensureRingState(state);

      var elementSelect = $("ring-select-element");
      var atomSelect = $("ring-select-atom");
      var detectedList = $("ring-detected-list");
      var calcButton = $("btn-ring-calculate");
      var clearButton = $("btn-ring-clear");
      var resultsBox = $("ring-results");

      if (elementSelect) {
        elementSelect.addEventListener("change", function () {
          var options = ensureRingState(state);
          options.centerElement = this.value;
          options.centerAtom = "";
          renderAll();
        });
      }

      if (atomSelect) {
        atomSelect.addEventListener("change", function () {
          var options = ensureRingState(state);
          options.centerAtom = this.value;
          renderAll();
        });
      }

      if (detectedList) {
        detectedList.addEventListener("change", function (event) {
          var input = event.target;

          if (!input.matches("input[type='checkbox'][data-ring-reverse]")) {
            return;
          }

          var options = ensureRingState(state);
          var key = input.getAttribute("data-ring-reverse");

          options.reverseByKey[key] = input.checked;
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
          state.ringResults = [];
          renderAll();
        });
      }

      if (resultsBox) {
        resultsBox.addEventListener("click", function (event) {
          var button = event.target;

          if (!button.matches("button[data-ring-remove]")) {
            return;
          }

          var id = button.getAttribute("data-ring-remove");

          state.ringResults = (state.ringResults || []).filter(function (result) {
            return result.id !== id;
          });

          renderAll();
        });
      }
    },

    render: function (state) {
      ensureRingState(state);

      if (!state.hasLoadedCif) {
        setHTML("ring-detected-list", "<p class=\"hint\">No CIF loaded.</p>");
        setHTML("ring-results", "<p class=\"hint\">Load a CIF file to calculate ring parameters.</p>");
        return;
      }

      renderControls(state);
      renderDetected(state);
      renderResults(state);
    }
  };
})();
