(function () {
  "use strict";

  window.CIFLord = window.CIFLord || {};

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function degToRad(x) {
    return x * Math.PI / 180;
  }

  function getSelectedForReport(state, listName) {
    return state[listName].filter(function (item) {
      return item.report;
    });
  }

  function computeStats(items) {
    var values = items
      .map(function (item) {
        return item.numericalValue;
      })
      .filter(function (v) {
        return typeof v === "number" && !isNaN(v);
      });

    var n = values.length;

    if (!n) {
      return {
        count: 0,
        mean: null,
        min: null,
        max: null,
        populationStdDev: null,
        sampleStdDev: null,
        sem: null
      };
    }

    var sum = values.reduce(function (a, b) {
      return a + b;
    }, 0);

    var mean = sum / n;
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);

    var sq = values.reduce(function (acc, v) {
      return acc + Math.pow(v - mean, 2);
    }, 0);

    var populationVariance = sq / n;
    var sampleVariance = n > 1 ? sq / (n - 1) : null;

    return {
      count: n,
      mean: mean,
      min: min,
      max: max,
      populationStdDev: Math.sqrt(populationVariance),
      sampleStdDev: sampleVariance === null ? null : Math.sqrt(sampleVariance),
      sem: sampleVariance === null ? null : Math.sqrt(sampleVariance) / Math.sqrt(n)
    };
  }

  function formatNumber(value, digits) {
    if (value === null || value === undefined || isNaN(value)) {
      return "-";
    }

    return Number(value).toFixed(digits);
  }

  function symmetrySymbolRank(symbol) {
    symbol = String(symbol || "");

    if (symbol === "'") return 1;
    if (symbol === "''") return 2;
    if (symbol === "'''") return 3;

    var romanMap = {
      I: 1,
      V: 5,
      X: 10,
      L: 50,
      C: 100,
      D: 500,
      M: 1000
    };

    var s = symbol.toUpperCase();
    var total = 0;
    var prev = 0;

    for (var i = s.length - 1; i >= 0; i--) {
      var value = romanMap[s.charAt(i)] || 0;

      if (value < prev) {
        total -= value;
      } else {
        total += value;
        prev = value;
      }
    }

    return total || 999999;
  }

  function usedSymmetryNotes(state, items) {
    var symbols = {};

    items.forEach(function (item) {
      (item.symRefs || []).forEach(function (s) {
        symbols[s] = true;
      });
    });

    return state.symmetryNotes
      .filter(function (note) {
        return symbols[note.symbol];
      })
      .sort(function (a, b) {
        return symmetrySymbolRank(a.symbol) - symmetrySymbolRank(b.symbol);
      });
  }

  function unquote(value) {
    value = String(value || "").trim();

    if (
      (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") ||
      (value.charAt(0) === "\"" && value.charAt(value.length - 1) === "\"")
    ) {
      return value.slice(1, -1);
    }

    return value;
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

  function headerIndex(loop, candidates) {
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

    return row[idx] || "";
  }

  function parseValueWithEsd(value) {
    value = unquote(String(value || "").trim());

    if (!value || value === "?" || value === ".") {
      return {
        original: value,
        numericalValue: NaN,
        esd: 0
      };
    }

    var m = value.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))(?:\((\d+)\))?$/);

    if (!m) {
      return {
        original: value,
        numericalValue: parseFloat(value),
        esd: 0
      };
    }

    var numberPart = m[1];
    var esdPart = m[2] || "";

    var numericalValue = parseFloat(numberPart);
    var esd = 0;

    if (esdPart) {
      var decimals = 0;
      var dot = numberPart.indexOf(".");

      if (dot !== -1) {
        decimals = numberPart.length - dot - 1;
      }

      esd = parseInt(esdPart, 10) * Math.pow(10, -decimals);
    }

    return {
      original: value,
      numericalValue: numericalValue,
      esd: esd
    };
  }
  
  function parseAbsoluteEsd(value) {
    value = normalizeMissing(value);

    if (!value) {
      return 0;
    }

    var parsed = parseValueWithEsd(value);

    if (isFinite(parsed.numericalValue)) {
      return Math.abs(parsed.numericalValue);
    }

    return 0;
  }

  function elementFromAtomLabel(label) {
    var m = String(label || "").match(/^([A-Z][a-z]?)/);

    return m ? m[1] : "";
  }
  
  var atomicNumbers = {
    H: 1, He: 2,
    Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
    Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18,
    K: 19, Ca: 20, Sc: 21, Ti: 22, V: 23, Cr: 24, Mn: 25, Fe: 26,
    Co: 27, Ni: 28, Cu: 29, Zn: 30, Ga: 31, Ge: 32, As: 33, Se: 34,
    Br: 35, Kr: 36, Rb: 37, Sr: 38, Y: 39, Zr: 40, Nb: 41, Mo: 42,
    Tc: 43, Ru: 44, Rh: 45, Pd: 46, Ag: 47, Cd: 48, In: 49, Sn: 50,
    Sb: 51, Te: 52, I: 53, Xe: 54, Cs: 55, Ba: 56, La: 57, Ce: 58,
    Pr: 59, Nd: 60, Pm: 61, Sm: 62, Eu: 63, Gd: 64, Tb: 65, Dy: 66,
    Ho: 67, Er: 68, Tm: 69, Yb: 70, Lu: 71, Hf: 72, Ta: 73, W: 74,
    Re: 75, Os: 76, Ir: 77, Pt: 78, Au: 79, Hg: 80, Tl: 81, Pb: 82,
    Bi: 83, Po: 84, At: 85, Rn: 86
  };

  function sortElementsHeavyToLight(elements) {
    return elements.slice().sort(function (a, b) {
      var za = atomicNumbers[a] || 0;
      var zb = atomicNumbers[b] || 0;

      if (za !== zb) {
        return zb - za;
      }

      return String(a).localeCompare(String(b));
    });
  }

  function unique(array) {
    var seen = {};
    var out = [];

    array.forEach(function (v) {
      if (!v) {
        return;
      }

      if (!seen[v]) {
        seen[v] = true;
        out.push(v);
      }
    });

    return out;
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

  function isPrimeSymmetrySymbol(symbol) {
    return symbol === "'" || symbol === "''" || symbol === "'''";
  }

  function symSup(symbol) {
    if (!symbol) {
      return "";
    }

    if (isPrimeSymmetrySymbol(symbol)) {
      return symbol;
    }

    return "<sup>" + symbol + "</sup>";
  }

  function symText(symbol) {
    if (!symbol) {
      return "";
    }

    if (isPrimeSymmetrySymbol(symbol)) {
      return symbol;
    }

    return "^" + symbol;
  }

  function symCodeBase(code) {
    code = normalizeMissing(code);

    if (!code) {
      return "";
    }

    return code;
  }

  function makeSymmetrySymbolFactory() {
    var map = {};
    var count = 0;

    return {
      get: function (code) {
        code = symCodeBase(code);

        if (!code) {
          return "";
        }

        if (!map[code]) {
          count++;
          map[code] = roman(count);
        }

        return map[code];
      },

      map: map
    };
  }

  function stripSymIdentity(sym) {
    sym = normalizeMissing(sym);

    if (!sym || sym === "555" || sym === "1_555") {
      return "";
    }

    return sym;
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

  function fractionToString(value) {
    var sign = value < 0 ? "-" : "";
    value = Math.abs(value);

    if (Math.abs(value) < 1e-10) {
      return "";
    }

    var candidates = [1, 2, 3, 4, 6, 8, 12];

    for (var i = 0; i < candidates.length; i++) {
      var den = candidates[i];
      var num = Math.round(value * den);

      if (Math.abs(value - num / den) < 1e-10) {
        if (den === 1) {
          return sign + String(num);
        }

        return sign + num + "/" + den;
      }
    }

    return sign + String(value);
  }

  function addOffsetToComponent(component, offset) {
    component = String(component || "").replace(/\s+/g, "");

    var normalized = component.replace(/-/g, "+-");

    if (normalized.charAt(0) === "+") {
      normalized = normalized.slice(1);
    }

    var parts = normalized.split("+");
    var variableTerms = [];
    var constant = 0;

    parts.forEach(function (part) {
      if (!part) {
        return;
      }

      if (/[xyz]/i.test(part)) {
        variableTerms.push(part);
      } else {
        constant += parseFraction(part);
      }
    });

    constant += offset;

    var varText = variableTerms.join("+").replace(/\+\-/g, "-");
    var constText = fractionToString(constant);

    if (!varText) {
      return constText || "0";
    }

    if (!constText) {
      return varText;
    }

    if (constText.charAt(0) === "-") {
      return varText + constText;
    }

    return varText + "+" + constText;
  }

  function applyTranslationToSymop(operation, translation) {
    operation = unquote(operation || "");

    var parts = operation.split(",");

    if (parts.length !== 3) {
      return operation;
    }

    translation = String(translation || "555");

    var offsets = [
      parseInt(translation.charAt(0) || "5", 10) - 5,
      parseInt(translation.charAt(1) || "5", 10) - 5,
      parseInt(translation.charAt(2) || "5", 10) - 5
    ];

    return [
      addOffsetToComponent(parts[0], offsets[0]),
      addOffsetToComponent(parts[1], offsets[1]),
      addOffsetToComponent(parts[2], offsets[2])
    ].join(", ");
  }

  function getSymOperationForCode(symmetryOps, code) {
    code = normalizeMissing(code);

    if (!code) {
      return "";
    }

    var parts = code.split("_");
    var opNumber;
    var translation;

    if (parts.length === 2) {
      opNumber = parts[0];
      translation = parts[1];
    } else {
      opNumber = parts[0];
      translation = "555";
    }

    var op = symmetryOps.find(function (s) {
      return String(s.id) === String(opNumber);
    });

    if (!op) {
      return "";
    }

    return applyTranslationToSymop(op.operation, translation);
  }

  function escapeAtom(label) {
    return String(label || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function extractSymmetryOps(parsed) {
    var loop =
      CIFLord.Parser.findLoopContaining(parsed, "_space_group_symop_operation_xyz") ||
      CIFLord.Parser.findLoopContaining(parsed, "_symmetry_equiv_pos_as_xyz");

    var ops = [];

    if (!loop) {
      return ops;
    }

    var opIdx = headerIndex(loop, [
      "_space_group_symop_operation_xyz",
      "_symmetry_equiv_pos_as_xyz"
    ]);

    var idIdx = headerIndex(loop, [
      "_space_group_symop_id",
      "_symmetry_equiv_pos_site_id"
    ]);

    loop.rows.forEach(function (row, i) {
      var operation = row[opIdx] || "";
      var id = idIdx !== -1 ? row[idIdx] : String(i + 1);

      ops.push({
        id: String(id),
        operation: unquote(operation)
      });
    });

    return ops;
  }

  function extractAtoms(parsed) {
    var loop = CIFLord.Parser.findLoopContaining(parsed, "_atom_site_label");

    if (!loop) {
      return [];
    }

    var atoms = [];

    loop.rows.forEach(function (row) {
      var label = rowValue(loop, row, ["_atom_site_label"]);
      var type = rowValue(loop, row, ["_atom_site_type_symbol"]);

      if (!type) {
        type = elementFromAtomLabel(label);
      }

      var x = parseValueWithEsd(rowValue(loop, row, ["_atom_site_fract_x"]));
      var y = parseValueWithEsd(rowValue(loop, row, ["_atom_site_fract_y"]));
      var z = parseValueWithEsd(rowValue(loop, row, ["_atom_site_fract_z"]));

      var xSu = parseAbsoluteEsd(rowValue(loop, row, [
        "_atom_site_fract_x_su",
        "_atom_site_fract_x_esd"
      ]));

      var ySu = parseAbsoluteEsd(rowValue(loop, row, [
        "_atom_site_fract_y_su",
        "_atom_site_fract_y_esd"
      ]));

      var zSu = parseAbsoluteEsd(rowValue(loop, row, [
        "_atom_site_fract_z_su",
        "_atom_site_fract_z_esd"
      ]));

      atoms.push({
        label: label,
        element: type,
        fractX: x.original,
        fractY: y.original,
        fractZ: z.original,

        x: x.numericalValue,
        y: y.numericalValue,
        z: z.numericalValue,

        xEsd: x.esd || xSu || 0,
        yEsd: y.esd || ySu || 0,
        zEsd: z.esd || zSu || 0
      });
    });

    return atoms;
  }

  function extractBonds(parsed, symmetryOps, symFactory) {
    var loop = CIFLord.Parser.findLoopContaining(parsed, "_geom_bond_atom_site_label_1");

    if (!loop) {
      return [];
    }

    var bonds = [];

    loop.rows.forEach(function (row, i) {
      var a1 = rowValue(loop, row, ["_geom_bond_atom_site_label_1"]);
      var a2 = rowValue(loop, row, ["_geom_bond_atom_site_label_2"]);
      var distance = rowValue(loop, row, ["_geom_bond_distance"]);

      if (!a1 || !a2 || !distance) {
        return;
      }

      var sym1 = stripSymIdentity(rowValue(loop, row, [
        "_geom_bond_site_symmetry_1",
        "_geom_bond_atom_site_symmetry_1"
      ]));

      var sym2 = stripSymIdentity(rowValue(loop, row, [
        "_geom_bond_site_symmetry_2",
        "_geom_bond_atom_site_symmetry_2"
      ]));

      var s1 = symFactory.get(sym1);
      var s2 = symFactory.get(sym2);

      var refs = unique([s1, s2]);
      var parsedValue = parseValueWithEsd(distance);

      bonds.push({
        id: "b" + (i + 1),
        source: "cif",
        kind: "bond",
      
        atom1Label: a1,
        atom2Label: a2,
        sym1Code: sym1,
        sym2Code: sym2,
      
        atomsHtml: escapeAtom(a1) + symSup(s1) + "&ndash;" + escapeAtom(a2) + symSup(s2),
        atomsText: a1 + symText(s1) + "-" + a2 + symText(s2),
        value: distance,
        numericalValue: parsedValue.numericalValue,
        esd: parsedValue.esd,
        report: true,
        average: true,
        symRefs: refs,
        symCodes: unique([sym1, sym2])
      });
    });

    return bonds;
  }

  function extractAngles(parsed, symmetryOps, symFactory) {
    var loop = CIFLord.Parser.findLoopContaining(parsed, "_geom_angle_atom_site_label_1");

    if (!loop) {
      return [];
    }

    var angles = [];

    loop.rows.forEach(function (row, i) {
      var a1 = rowValue(loop, row, ["_geom_angle_atom_site_label_1"]);
      var a2 = rowValue(loop, row, ["_geom_angle_atom_site_label_2"]);
      var a3 = rowValue(loop, row, ["_geom_angle_atom_site_label_3"]);
      var angle = rowValue(loop, row, ["_geom_angle"]);

      if (!a1 || !a2 || !a3 || !angle) {
        return;
      }

      var sym1 = stripSymIdentity(rowValue(loop, row, [
        "_geom_angle_site_symmetry_1",
        "_geom_angle_atom_site_symmetry_1"
      ]));

      var sym2 = stripSymIdentity(rowValue(loop, row, [
        "_geom_angle_site_symmetry_2",
        "_geom_angle_atom_site_symmetry_2"
      ]));

      var sym3 = stripSymIdentity(rowValue(loop, row, [
        "_geom_angle_site_symmetry_3",
        "_geom_angle_atom_site_symmetry_3"
      ]));

      var s1 = symFactory.get(sym1);
      var s2 = symFactory.get(sym2);
      var s3 = symFactory.get(sym3);

      var refs = unique([s1, s2, s3]);
      var parsedValue = parseValueWithEsd(angle);

      angles.push({
        id: "a" + (i + 1),
        source: "cif",
        kind: "angle",
        atomsHtml:
          escapeAtom(a1) + symSup(s1) +
          "&ndash;" + escapeAtom(a2) + symSup(s2) +
          "&ndash;" + escapeAtom(a3) + symSup(s3),
        atomsText:
          a1 + symText(s1) +
          "-" + a2 + symText(s2) +
          "-" + a3 + symText(s3),
        value: angle,
        numericalValue: parsedValue.numericalValue,
        esd: parsedValue.esd,
        report: true,
        average: true,
        symRefs: refs,
        symCodes: unique([sym1, sym2, sym3])
      });
    });

    return angles;
  }

  function buildSymmetryNotes(symFactory, symmetryOps) {
    var notes = [];

    Object.keys(symFactory.map).forEach(function (code) {
      var symbol = symFactory.map[code];
      var operation = getSymOperationForCode(symmetryOps, code);

      if (symbol && operation) {
        notes.push({
          symbol: symbol,
          code: code,
          operation: operation
        });
      }
    });

    return notes;
  }

  function extractCell(parsed) {
    function get(name) {
      return parsed.items[name] || "";
    }

    var a = parseValueWithEsd(get("_cell_length_a"));
    var b = parseValueWithEsd(get("_cell_length_b"));
    var c = parseValueWithEsd(get("_cell_length_c"));
    var alpha = parseValueWithEsd(get("_cell_angle_alpha"));
    var beta = parseValueWithEsd(get("_cell_angle_beta"));
    var gamma = parseValueWithEsd(get("_cell_angle_gamma"));

    var aSu = parseAbsoluteEsd(
      get("_cell_length_a_su") || get("_cell_length_a_esd")
    );

    var bSu = parseAbsoluteEsd(
      get("_cell_length_b_su") || get("_cell_length_b_esd")
    );

    var cSu = parseAbsoluteEsd(
      get("_cell_length_c_su") || get("_cell_length_c_esd")
    );

    var alphaSu = parseAbsoluteEsd(
      get("_cell_angle_alpha_su") || get("_cell_angle_alpha_esd")
    );

    var betaSu = parseAbsoluteEsd(
      get("_cell_angle_beta_su") || get("_cell_angle_beta_esd")
    );

    var gammaSu = parseAbsoluteEsd(
      get("_cell_angle_gamma_su") || get("_cell_angle_gamma_esd")
    );

    return {
      aRaw: a.original,
      bRaw: b.original,
      cRaw: c.original,
      alphaRaw: alpha.original,
      betaRaw: beta.original,
      gammaRaw: gamma.original,

      a: a.numericalValue,
      b: b.numericalValue,
      c: c.numericalValue,
      alpha: alpha.numericalValue,
      beta: beta.numericalValue,
      gamma: gamma.numericalValue,

      aEsd: a.esd || aSu || 0,
      bEsd: b.esd || bSu || 0,
      cEsd: c.esd || cSu || 0,
      alphaEsd: alpha.esd || alphaSu || 0,
      betaEsd: beta.esd || betaSu || 0,
      gammaEsd: gamma.esd || gammaSu || 0
    };
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

    var parts = normalized.split("+");

    parts.forEach(function (part) {
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
    operation = unquote(operation || "");
    var parts = operation.split(",");

    if (parts.length !== 3) {
      return null;
    }

    return [
      parseSymComponent(parts[0]),
      parseSymComponent(parts[1]),
      parseSymComponent(parts[2])
    ];
  }

  function transformFractional(atom, symOp, code) {
    code = String(code || "555");

    var offsets = [
      parseInt(code.charAt(0) || "5", 10) - 5,
      parseInt(code.charAt(1) || "5", 10) - 5,
      parseInt(code.charAt(2) || "5", 10) - 5
    ];

    function apply(comp, offset) {
      return comp.x * atom.x + comp.y * atom.y + comp.z * atom.z + comp.c + offset;
    }

    return {
      x: apply(symOp[0], offsets[0]),
      y: apply(symOp[1], offsets[1]),
      z: apply(symOp[2], offsets[2]),
      xEsd: atom.xEsd || 0,
      yEsd: atom.yEsd || 0,
      zEsd: atom.zEsd || 0
    };
  }

  function distanceSquare(delta1, delta2, delta3, alpha, beta, gamma) {
    return (
      delta1 * delta1 +
      delta2 * delta2 +
      delta3 * delta3 +
      2 * delta1 * delta2 * Math.cos(gamma) +
      2 * delta1 * delta3 * Math.cos(beta) +
      2 * delta2 * delta3 * Math.cos(alpha)
    );
  }

  function distanceEsdSquareNumerator(delta1, delta2, delta3, cell, atomA, atomB) {
    var a = cell.a;
    var b = cell.b;
    var c = cell.c;

    var alpha = degToRad(cell.alpha);
    var beta = degToRad(cell.beta);
    var gamma = degToRad(cell.gamma);

    var aEsd = cell.aEsd || 0;
    var bEsd = cell.bEsd || 0;
    var cEsd = cell.cEsd || 0;

    var alphaEsd = degToRad(cell.alphaEsd || 0);
    var betaEsd = degToRad(cell.betaEsd || 0);
    var gammaEsd = degToRad(cell.gammaEsd || 0);

    var xAesd = atomA.xEsd || 0;
    var xBesd = atomB.xEsd || 0;
    var yAesd = atomA.yEsd || 0;
    var yBesd = atomB.yEsd || 0;
    var zAesd = atomA.zEsd || 0;
    var zBesd = atomB.zEsd || 0;

    var C1 = Math.pow(delta1 + delta2 * Math.cos(gamma) + delta3 * Math.cos(beta), 2);
    var C2 = Math.pow(delta1 * Math.cos(gamma) + delta2 + delta3 * Math.cos(alpha), 2);
    var C3 = Math.pow(delta1 * Math.cos(beta) + delta2 * Math.cos(alpha) + delta3, 2);

    var D1 = Math.pow(delta1, 2) * Math.pow(aEsd / a || 0, 2) + Math.pow(a, 2) * (Math.pow(xAesd, 2) + Math.pow(xBesd, 2));
    var D2 = Math.pow(delta2, 2) * Math.pow(bEsd / b || 0, 2) + Math.pow(b, 2) * (Math.pow(yAesd, 2) + Math.pow(yBesd, 2));
    var D3 = Math.pow(delta3, 2) * Math.pow(cEsd / c || 0, 2) + Math.pow(c, 2) * (Math.pow(zAesd, 2) + Math.pow(zBesd, 2));

    var E1 = Math.pow(delta1 * delta2 * gammaEsd * Math.sin(gamma), 2);
    var E2 = Math.pow(delta1 * delta3 * betaEsd * Math.sin(beta), 2);
    var E3 = Math.pow(delta2 * delta3 * alphaEsd * Math.sin(alpha), 2);

    return C1 * D1 + C2 * D2 + C3 * D3 + E1 + E2 + E3;
  }

  function formatDistanceWithEsd(distance, esd) {
    if (!isFinite(distance)) {
      return "";
    }

    if (!esd || !isFinite(esd) || esd <= 0) {
      return distance.toFixed(4) + "(0)";
    }

    var decimals = Math.ceil(-Math.log(esd) / Math.LN10);
    if (decimals < 0) decimals = 0;
    if (decimals > 8) decimals = 8;

    var scaled = esd * Math.pow(10, decimals);
    var firstDigit = Math.floor(scaled);

    if (firstDigit === 1 && decimals < 8) {
      decimals++;
    }

    var esdInt = Math.round(esd * Math.pow(10, decimals));

    if (esdInt >= 100 && decimals > 0) {
      decimals--;
      esdInt = Math.round(esd * Math.pow(10, decimals));
    }

    return distance.toFixed(decimals) + "(" + esdInt + ")";
  }

  function getAtomByLabel(state, label) {
    return (state.atoms || []).find(function (atom) {
      return atom.label === label;
    });
  }

  function getSymOpById(state, id) {
    return (state.symmetryOps || []).find(function (op) {
      return String(op.id) === String(id);
    });
  }

  function calculateInteratomicDistance(state, options) {
    options = options || {};

    var atomA = getAtomByLabel(state, options.atomA);
    var atomBOriginal = getAtomByLabel(state, options.atomB);
    var symOpEntry = getSymOpById(state, options.symOpId || "1");

    if (!atomA || !atomBOriginal || !symOpEntry) {
      return null;
    }

    var cell = state.cell || {};

    if (
      !isFinite(cell.a) || !isFinite(cell.b) || !isFinite(cell.c) ||
      !isFinite(cell.alpha) || !isFinite(cell.beta) || !isFinite(cell.gamma)
    ) {
      return null;
    }

    var symParsed = parseSymOperation(symOpEntry.operation);

    if (!symParsed) {
      return null;
    }

    var code = String(options.code || "555");
    var atomB = transformFractional(atomBOriginal, symParsed, code);

    var dx = atomA.x - atomB.x;
    var dy = atomA.y - atomB.y;
    var dz = atomA.z - atomB.z;

    var delta1 = cell.a * dx;
    var delta2 = cell.b * dy;
    var delta3 = cell.c * dz;

    var alpha = degToRad(cell.alpha);
    var beta = degToRad(cell.beta);
    var gamma = degToRad(cell.gamma);

    var d2 = distanceSquare(delta1, delta2, delta3, alpha, beta, gamma);

    if (d2 < 0 && d2 > -1e-10) {
      d2 = 0;
    }

    if (d2 < 0) {
      return null;
    }

    var d = Math.sqrt(d2);

    var esd = 0;

    if (d2 > 0) {
      var numerator = distanceEsdSquareNumerator(delta1, delta2, delta3, cell, atomA, atomB);
      var esdSq = numerator / d2;

      if (esdSq >= 0 && isFinite(esdSq)) {
        esd = Math.sqrt(esdSq);
      }
    }

    var display = formatDistanceWithEsd(d, esd);
    var opDisplay = applyTranslationToSymop(symOpEntry.operation, code);

    return {
      atomA: atomA.label,
      atomB: atomBOriginal.label,
      atomsHtml: escapeAtom(atomA.label) + "&middot;&middot;&middot;" + escapeAtom(atomBOriginal.label),
      atomsText: atomA.label + "..." + atomBOriginal.label,
      distance: d,
      esd: esd,
      value: display,
      operation: opDisplay,
      symOpId: String(symOpEntry.id),
      code: code
    };
  }

  function atomMatchesSelector(atom, selector) {
    selector = String(selector || "");

    if (selector.indexOf("all ") === 0) {
      var el = selector.replace(/^all\s+/, "");
      return atom.element === el;
    }

    return atom.label === selector;
  }

  function isIdentitySymmetryOperation(operation) {
    var normalized = String(operation || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/\+0/g, "")
      .replace(/-0/g, "");

    return normalized === "x,y,z";
  }

  function isReverseDirectDuplicate(existingResults, candidate) {
    var tolerance = 0.00005;

    /*
      Never treat self-pairs as reverse duplicates.

      This is important:
      Fe1...Fe1^I and Fe1...Fe1^IV may have identical distances,
      but they are different symmetry-generated contacts.
    */
    if (candidate.atomA === candidate.atomB) {
      return false;
    }

    /*
      Only remove direct identity-operation reverse duplicates.

      This removes:
      Fe1...Fe2
      Fe2...Fe1

      But keeps anything involving a non-identity operation:
      Fe1...Fe2'
      Fe2'...Fe1
      Fe1...Fe1^IV
    */
    if (!isIdentitySymmetryOperation(candidate.operation)) {
      return false;
    }

    return existingResults.some(function (existing) {
      if (existing.atomA === existing.atomB) {
        return false;
      }

      if (!isIdentitySymmetryOperation(existing.operation)) {
        return false;
      }

      var reversedAtoms =
        existing.atomA === candidate.atomB &&
        existing.atomB === candidate.atomA;

      if (!reversedAtoms) {
        return false;
      }

      return Math.abs(existing.distance - candidate.distance) < tolerance;
    });
  }

  function searchInteratomicDistances(state, options) {
    options = options || {};

    var origin = options.origin || options.atomA || "";
    var target = options.target || "";

    var min = parseFloat(options.min);
    var max = parseFloat(options.max);

    if (!isFinite(min)) min = 1;
    if (!isFinite(max)) max = 4;

    var results = [];
    var atoms = state.atoms || [];
    var symOps = state.symmetryOps || [];

    var originAtoms = atoms.filter(function (atom) {
      return atomMatchesSelector(atom, origin);
    });

    var targetAtoms = atoms.filter(function (atom) {
      return atomMatchesSelector(atom, target);
    });

    var codes = [];

    for (var x = 4; x <= 6; x++) {
      for (var y = 4; y <= 6; y++) {
        for (var z = 4; z <= 6; z++) {
          codes.push(String(x) + String(y) + String(z));
        }
      }
    }

    originAtoms.forEach(function (atomA) {
      targetAtoms.forEach(function (atomB) {
        symOps.forEach(function (symOp) {
          codes.forEach(function (code) {
            var res = calculateInteratomicDistance(state, {
              atomA: atomA.label,
              atomB: atomB.label,
              symOpId: symOp.id,
              code: code
            });

            if (!res) {
              return;
            }

            if (res.distance <= min || res.distance >= max) {
              return;
            }

            if (res.distance < 1e-8 && atomA.label === atomB.label) {
              return;
            }

            if (isReverseDirectDuplicate(results, res)) {
              return;
            }

            results.push(res);
          });
        });
      });
    });

    results.sort(function (a, b) {
      return a.distance - b.distance;
    });

    return results;
  }

  CIFLord.Core = {
    createInitialState: function () {
      return clone(CIFLord.Data.emptyState);
    },

    updateStateFromParsedCIF: function (state, parsed, fileName) {
      var symmetryOps = extractSymmetryOps(parsed);
      var atoms = extractAtoms(parsed);
      var elements = sortElementsHeavyToLight(unique(atoms.map(function (atom) {
        return atom.element;
      })).filter(function (el) {
        return el !== "H";
      }));

      var symFactory = makeSymmetrySymbolFactory();

      var bonds = extractBonds(parsed, symmetryOps, symFactory);
      var angles = extractAngles(parsed, symmetryOps, symFactory);
      var symmetryNotes = buildSymmetryNotes(symFactory, symmetryOps);

      state.fileName = fileName || "loaded.cif";
      state.dataName = parsed.dataName || state.dataName;
      state.status = "CIF loaded";
      state.hasLoadedCif = true;

      state.items = parsed.items;
      state.cell = extractCell(parsed);
      state.atoms = atoms;
      state.elements = elements;
      state.symmetryOps = symmetryOps;

      state.bonds = bonds;
      state.angles = angles;
      state.addedDistances = [];
      state.interatomicSearchResults = [];
      state.symmetryNotes = symmetryNotes;
      state.lastSingleDistance = null;
      
      state.geometryOptions = {
        centerElement: "",
        centerAtom: "",
        selectedLigandKeysByCenter: {}
      };
      
      state.geometryResults = [];

      state.sortOptions = {
        bonds: "cif",
        angles: "cif"
      };

      state.selectionOptions = {
        independentOnly: false
      };

      state.reportOptions = state.reportOptions || {};

      if (typeof state.reportOptions.middleAtomOnly !== "boolean") {
        state.reportOptions.middleAtomOnly = false;
      }

      state.warnings = [];

      if (parsed.warnings && parsed.warnings.length) {
        state.warnings = state.warnings.concat(parsed.warnings);
      }

      if (!atoms.length) {
        state.warnings.push("No atom site loop found.");
      }

      if (!symmetryOps.length) {
        state.warnings.push("No symmetry operation loop found.");
      }

      if (!bonds.length) {
        state.warnings.push("No geometry bond loop found.");
      }

      if (!angles.length) {
        state.warnings.push("No geometry angle loop found.");
      }

      if (!state.warnings.length) {
        state.warnings.push("CIF loaded successfully.");
      }

      return state;
    },

    getSelectedForReport: getSelectedForReport,
    computeStats: computeStats,
    formatNumber: formatNumber,
    usedSymmetryNotes: usedSymmetryNotes,

    parseValueWithEsd: parseValueWithEsd,
    applyTranslationToSymop: applyTranslationToSymop,
    calculateInteratomicDistance: calculateInteratomicDistance,
    searchInteratomicDistances: searchInteratomicDistances
  };
})();