(function () {
  "use strict";

  window.CIFLord = window.CIFLord || {};

  /*
    Experimental static ORTEP SVG prototype.

    Design goals:
    - independent from the main CIFLord app
    - only requires parser.js
    - uses CIF geometry bonds
    - handles symmetry-generated bond partners
    - draws displacement ellipsoids as SVG wireframe rings

    Important:
    ADP handling should be validated against known ORTEP/Mercury/Olex2 output.
  */

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
    value = String(value || "").trim();
    return value === "." || value === "?" ? "" : value;
  }

  function parseNumber(value) {
    value = unquote(String(value || "").trim());
  
    if (!value || value === "." || value === "?") {
      return NaN;
    }
  
    /*
      Remove crystallographic e.s.d. notation:
        13.1383(12) -> 13.1383
    */
    value = value.replace(/\([^)]*\)$/g, "");
  
    return parseFloat(value);
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

  function elementFromLabel(label) {
    var m = String(label || "").match(/^([A-Z][a-z]?)/);
    return m ? m[1] : "";
  }

  function normalizeElement(el) {
    if (CIFLord.Elements && CIFLord.Elements.normalizeElement) {
      return CIFLord.Elements.normalizeElement(el);
    }

    el = String(el || "").replace(/[^A-Za-z]/g, "");

    if (!el) {
      return "";
    }

    if (el.length === 1) {
      return el.toUpperCase();
    }

    return el.charAt(0).toUpperCase() + el.charAt(1).toLowerCase();
  }

  function escapeXml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function findLoop(parsed, header) {
    return CIFLord.Parser.findLoopContaining(parsed, header);
  }

  /*
    Cell / coordinate transformation
  */

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

  function fracToCart(M, f) {
    return [
      M[0][0] * f[0] + M[0][1] * f[1] + M[0][2] * f[2],
      M[1][0] * f[0] + M[1][1] * f[1] + M[1][2] * f[2],
      M[2][0] * f[0] + M[2][1] * f[1] + M[2][2] * f[2]
    ];
  }

  function unitCellBasis(M) {
    var a = normalize3([M[0][0], M[1][0], M[2][0]]);
    var b = normalize3([M[0][1], M[1][1], M[2][1]]);
    var c = normalize3([M[0][2], M[1][2], M[2][2]]);

    return [
      [a[0], b[0], c[0]],
      [a[1], b[1], c[1]],
      [a[2], b[2], c[2]]
    ];
  }

  /*
    CIF extraction
  */

  function extractCell(parsed) {
    function get(name) {
      return parsed.items[name] || "";
    }

    return {
      a: parseNumber(get("_cell_length_a")),
      b: parseNumber(get("_cell_length_b")),
      c: parseNumber(get("_cell_length_c")),
      alpha: parseNumber(get("_cell_angle_alpha")),
      beta: parseNumber(get("_cell_angle_beta")),
      gamma: parseNumber(get("_cell_angle_gamma"))
    };
  }

  function extractSymmetryOps(parsed) {
    var loop =
      findLoop(parsed, "_space_group_symop_operation_xyz") ||
      findLoop(parsed, "_symmetry_equiv_pos_as_xyz");

    if (!loop) {
      return [
        {
          id: "1",
          operation: "x,y,z"
        }
      ];
    }

    var opIdx = headerIndex(loop, [
      "_space_group_symop_operation_xyz",
      "_symmetry_equiv_pos_as_xyz"
    ]);

    var idIdx = headerIndex(loop, [
      "_space_group_symop_id",
      "_symmetry_equiv_pos_site_id"
    ]);

    return loop.rows.map(function (row, i) {
      return {
        id: idIdx !== -1 ? String(row[idIdx]) : String(i + 1),
        operation: unquote(row[opIdx] || "x,y,z")
      };
    });
  }

  function extractAnisotropicAdps(parsed) {
    var loop = findLoop(parsed, "_atom_site_aniso_label");

    if (!loop) {
      return {};
    }

    var out = {};

    loop.rows.forEach(function (row) {
      var label = rowValue(loop, row, ["_atom_site_aniso_label"]);

      if (!label) {
        return;
      }

      var u11 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_U_11"]));
      var u22 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_U_22"]));
      var u33 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_U_33"]));
      var u12 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_U_12"]));
      var u13 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_U_13"]));
      var u23 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_U_23"]));

      /*
        Optional B tensor support.
        B = 8*pi^2*U  => U = B/(8*pi^2)
      */
      if (!isFinite(u11)) {
        var b11 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_B_11"]));
        var b22 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_B_22"]));
        var b33 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_B_33"]));
        var b12 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_B_12"]));
        var b13 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_B_13"]));
        var b23 = parseNumber(rowValue(loop, row, ["_atom_site_aniso_B_23"]));

        var fac = 8 * Math.PI * Math.PI;

        u11 = b11 / fac;
        u22 = b22 / fac;
        u33 = b33 / fac;
        u12 = b12 / fac;
        u13 = b13 / fac;
        u23 = b23 / fac;
      }

      if (
        !isFinite(u11) ||
        !isFinite(u22) ||
        !isFinite(u33) ||
        !isFinite(u12) ||
        !isFinite(u13) ||
        !isFinite(u23)
      ) {
        return;
      }

      out[label] = {
        u11: u11,
        u22: u22,
        u33: u33,
        u12: u12,
        u13: u13,
        u23: u23
      };
    });

    return out;
  }

  function extractAtoms(parsed, cell, M, adps) {
    var loop = findLoop(parsed, "_atom_site_label");
  
    if (!loop) {
      return [];
    }
  
    return loop.rows.map(function (row, rowIndex) {
      var label = rowValue(loop, row, ["_atom_site_label"]);
      var element = rowValue(loop, row, ["_atom_site_type_symbol"]);

      if (!element) {
        element = elementFromLabel(label);
      }

      var f = [
        parseNumber(rowValue(loop, row, ["_atom_site_fract_x"])),
        parseNumber(rowValue(loop, row, ["_atom_site_fract_y"])),
        parseNumber(rowValue(loop, row, ["_atom_site_fract_z"]))
      ];

      if (!label || !f.every(isFinite)) {
        return null;
      }

      var cart = fracToCart(M, f);

      return {
        sourceId: label + "#" + rowIndex,
        sourceIndex: rowIndex,
      
        label: label,
        element: normalizeElement(element),
        fract: f,
        cart: cart,
        adp: adps[label] || null,
        uiso: parseNumber(rowValue(loop, row, ["_atom_site_U_iso_or_equiv"])),
        adpType: rowValue(loop, row, ["_atom_site_adp_type"]),
        occupancy: rowValue(loop, row, ["_atom_site_occupancy"]),
        disorderAssembly: rowValue(loop, row, ["_atom_site_disorder_assembly"]),
        disorderGroup: rowValue(loop, row, ["_atom_site_disorder_group"])
      };
    }).filter(Boolean);
  }

  function stripSymIdentity(sym) {
    sym = normalizeMissing(sym);

    if (!sym || sym === "555" || sym === "1_555") {
      return "";
    }

    return sym;
  }

  function extractBonds(parsed) {
    var loop = findLoop(parsed, "_geom_bond_atom_site_label_1");

    if (!loop) {
      return [];
    }

    return loop.rows.map(function (row, i) {
      var a1 = rowValue(loop, row, ["_geom_bond_atom_site_label_1"]);
      var a2 = rowValue(loop, row, ["_geom_bond_atom_site_label_2"]);
      var dist = rowValue(loop, row, ["_geom_bond_distance"]);

      if (!a1 || !a2) {
        return null;
      }

      return {
        id: "b" + (i + 1),
        atom1Label: a1,
        atom2Label: a2,
        sym1Code: stripSymIdentity(rowValue(loop, row, [
          "_geom_bond_site_symmetry_1",
          "_geom_bond_atom_site_symmetry_1"
        ])),
        sym2Code: stripSymIdentity(rowValue(loop, row, [
          "_geom_bond_site_symmetry_2",
          "_geom_bond_atom_site_symmetry_2"
        ])),
        value: dist,
        distance: parseNumber(dist)
      };
    }).filter(Boolean);
  }

  function hydrogenParentMaxDistance(parentElement) {
    if (CIFLord.Elements && CIFLord.Elements.hydrogenParentMaxDistance) {
      return CIFLord.Elements.hydrogenParentMaxDistance(parentElement);
    }

    return 1.25;
  }
  
  function disorderCompatibleForHydrogen(parent, hydrogen) {
    /*
      Avoid attaching H atoms across explicit disorder groups.
      If CIF disorder information is absent, allow the match.
    */
    if (
      parent.disorderAssembly &&
      hydrogen.disorderAssembly &&
      parent.disorderAssembly !== hydrogen.disorderAssembly
    ) {
      return false;
    }

    if (
      parent.disorderGroup &&
      hydrogen.disorderGroup &&
      parent.disorderGroup !== hydrogen.disorderGroup
    ) {
      return false;
    }

    return true;
  }

  function inferAttachedHydrogens(atoms) {
    var attached = {};
    var hydrogens = atoms.filter(function (atom) {
      return atom.element === "H";
    });

    var parents = atoms.filter(function (atom) {
      return atom.element !== "H";
    });

    hydrogens.forEach(function (hydrogen) {
      var bestParent = null;
      var bestDistance = Infinity;

      parents.forEach(function (parent) {
        if (!disorderCompatibleForHydrogen(parent, hydrogen)) {
          return;
        }

        var d = distance3(parent.cart, hydrogen.cart);
        var maxDistance = hydrogenParentMaxDistance(parent.element);

        /*
          Ignore unreasonably short or long contacts.
        */
        if (d < 0.4 || d > maxDistance) {
          return;
        }

        if (d < bestDistance) {
          bestDistance = d;
          bestParent = parent;
        }
      });

      if (!bestParent) {
        return;
      }

      var parentId = bestParent.sourceId || bestParent.label;
      var hydrogenId = hydrogen.sourceId || hydrogen.label;
      
      attached[parentId] = attached[parentId] || [];
      attached[parentId].push(hydrogenId);
    });

    return attached;
  }

  function parseCif(parsed) {
    var cell = extractCell(parsed);

    if (
      !isFinite(cell.a) ||
      !isFinite(cell.b) ||
      !isFinite(cell.c) ||
      !isFinite(cell.alpha) ||
      !isFinite(cell.beta) ||
      !isFinite(cell.gamma)
    ) {
      throw new Error("Unit-cell parameters are incomplete.");
    }

    var M = orthMatrix(cell);
    var adps = extractAnisotropicAdps(parsed);
    var atoms = extractAtoms(parsed, cell, M, adps);
    var symops = extractSymmetryOps(parsed);
    var bonds = extractBonds(parsed);

    var atomByLabel = {};
    var atomsByLabel = {};
    var atomBySourceId = {};
    
    atoms.forEach(function (atom) {
      atomBySourceId[atom.sourceId] = atom;
    
      atomsByLabel[atom.label] = atomsByLabel[atom.label] || [];
      atomsByLabel[atom.label].push(atom);
    
      /*
        Keep the first occurrence for legacy label-based lookup.
        Duplicate labels are non-ideal CIF input, but this prevents later
        duplicates from silently overwriting earlier ones.
      */
      if (!atomByLabel[atom.label]) {
        atomByLabel[atom.label] = atom;
      }
    });

    var attachedHydrogensByParent = inferAttachedHydrogens(atoms);

    return {
      dataName: parsed.dataName || "untitled",
      cell: cell,
      M: M,
      basisUnit: unitCellBasis(M),
      atoms: atoms,
      atomByLabel: atomByLabel,
      atomsByLabel: atomsByLabel,
      atomBySourceId: atomBySourceId,
      symops: symops,
      bonds: bonds,
      attachedHydrogensByParent: attachedHydrogensByParent,
      adpCount: atoms.filter(function (atom) {
        return !!atom.adp;
      }).length
    };
  }

  /*
    Symmetry
  */

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
  
  function symmetrySymbolText(symbol) {
    if (!symbol) {
      return "";
    }
  
    if (symbol === "'" || symbol === "''" || symbol === "'''") {
      return symbol;
    }
  
    return "(" + symbol + ")";
  }
  
  function symmetrySymbolSvg(symbol) {
    if (!symbol) {
      return "";
    }
  
    if (symbol === "'" || symbol === "''" || symbol === "'''") {
      return escapeXml(symbol);
    }
  
    return "<tspan baseline-shift=\"super\" font-size=\"70%\">" +
      escapeXml(symbol) +
      "</tspan>";
  }
  
  function atomLabelSvg(atom) {
    if (!atom.symmetrySymbol) {
      return escapeXml(atom.label);
    }

    return escapeXml(atom.label) + symmetrySymbolSvg(atom.symmetrySymbol);
  }

  function nearlyInteger(value) {
    return Math.abs(value - Math.round(value)) < 1e-8;
  }

  function normalizeFractionalOffset(value) {
    /*
      Keep integer translations meaningful, but avoid -0.
    */
    if (Math.abs(value) < 1e-10) {
      return 0;
    }
  
    if (nearlyInteger(value)) {
      return Math.round(value);
    }
  
    return value;
  }
  
  function fractionToString(value) {
    value = normalizeFractionalOffset(value);
  
    var sign = value < 0 ? "-" : "";
    value = Math.abs(value);
  
    if (Math.abs(value) < 1e-10) {
      return "";
    }
  
    var candidates = [1, 2, 3, 4, 6, 8, 12];
  
    for (var i = 0; i < candidates.length; i++) {
      var den = candidates[i];
      var num = Math.round(value * den);
  
      if (Math.abs(value - num / den) < 1e-8) {
        if (num === 0) {
          return "";
        }
  
        if (den === 1) {
          return sign + String(num);
        }
  
        return sign + num + "/" + den;
      }
    }
  
    return sign + String(Number(value.toFixed(6)));
  }

  function affineIsIdentity(T) {
    if (!T || !T.R || !T.t) {
      return true;
    }
  
    var I = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];
  
    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        if (Math.abs(T.R[i][j] - I[i][j]) > 1e-8) {
          return false;
        }
      }
  
      if (Math.abs(T.t[i]) > 1e-8) {
        return false;
      }
    }
  
    return true;
  }
  
  function affineSignature(T) {
    if (!T || !T.R || !T.t) {
      return "identity";
    }
  
    return [
      T.R[0][0], T.R[0][1], T.R[0][2], normalizeFractionalOffset(T.t[0]),
      T.R[1][0], T.R[1][1], T.R[1][2], normalizeFractionalOffset(T.t[1]),
      T.R[2][0], T.R[2][1], T.R[2][2], normalizeFractionalOffset(T.t[2])
    ].map(function (value) {
      return Number(value).toFixed(6);
    }).join(",");
  }

  function formatAffineComponent(row, offset) {
    var vars = ["x", "y", "z"];
    var parts = [];
  
    row.forEach(function (coef, i) {
      if (Math.abs(coef) < 1e-10) {
        return;
      }
  
      if (Math.abs(coef - 1) < 1e-10) {
        parts.push(vars[i]);
      } else if (Math.abs(coef + 1) < 1e-10) {
        parts.push("-" + vars[i]);
      } else {
        parts.push(Number(coef.toFixed(6)) + "*" + vars[i]);
      }
    });
  
    var constant = fractionToString(offset);
  
    var text = parts.join("+").replace(/\+\-/g, "-");
  
    if (!text) {
      return constant || "0";
    }
  
    if (!constant) {
      return text;
    }
  
    if (constant.charAt(0) === "-") {
      return text + constant;
    }
  
    return text + "+" + constant;
  }
  
  function formatAffineOperation(T) {
    if (!T || !T.R || !T.t) {
      return "x, y, z";
    }
  
    return [
      formatAffineComponent(T.R[0], T.t[0]),
      formatAffineComponent(T.R[1], T.t[1]),
      formatAffineComponent(T.R[2], T.t[2])
    ].join(", ");
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
    operation = unquote(operation || "x,y,z");

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

  function symParsedToMatrix(symParsed) {
    return [
      [symParsed[0].x, symParsed[0].y, symParsed[0].z],
      [symParsed[1].x, symParsed[1].y, symParsed[1].z],
      [symParsed[2].x, symParsed[2].y, symParsed[2].z]
    ];
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

  function getSymOperation(model, opId) {
    var op = model.symops.find(function (entry) {
      return String(entry.id) === String(opId);
    });

    return op ? op.operation : "x,y,z";
  }

  function applySymToFractional(fract, symParsed, translation) {
    translation = String(translation || "555");

    var offsets = [
      parseInt(translation.charAt(0) || "5", 10) - 5,
      parseInt(translation.charAt(1) || "5", 10) - 5,
      parseInt(translation.charAt(2) || "5", 10) - 5
    ];

    function apply(comp, offset) {
      return (
        comp.x * fract[0] +
        comp.y * fract[1] +
        comp.z * fract[2] +
        comp.c +
        offset
      );
    }

    return [
      apply(symParsed[0], offsets[0]),
      apply(symParsed[1], offsets[1]),
      apply(symParsed[2], offsets[2])
    ];
  }

  /*
    Affine transformations in fractional coordinates

    f' = R*f + t
  */

  function identityTransform() {
    return {
      R: [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ],
      t: [0, 0, 0],
      code: ""
    };
  }

  function translationOffsetsFromCode(translation) {
    translation = String(translation || "555");

    return [
      parseInt(translation.charAt(0) || "5", 10) - 5,
      parseInt(translation.charAt(1) || "5", 10) - 5,
      parseInt(translation.charAt(2) || "5", 10) - 5
    ];
  }

  function affineFromSymCode(model, symCode) {
    if (isIdentitySymCode(symCode)) {
      return identityTransform();
    }

    var parsedCode = parseSymCode(symCode);
    var operation = getSymOperation(model, parsedCode.opId);
    var symParsed = parseSymOperation(operation);
    var R = symParsedToMatrix(symParsed);
    var offsets = translationOffsetsFromCode(parsedCode.translation);

    var t = [
      symParsed[0].c + offsets[0],
      symParsed[1].c + offsets[1],
      symParsed[2].c + offsets[2]
    ];

    return {
      R: R,
      t: t,
      code: symCode || ""
    };
  }

  function applyAffine(T, f) {
    return [
      T.R[0][0] * f[0] + T.R[0][1] * f[1] + T.R[0][2] * f[2] + T.t[0],
      T.R[1][0] * f[0] + T.R[1][1] * f[1] + T.R[1][2] * f[2] + T.t[1],
      T.R[2][0] * f[0] + T.R[2][1] * f[1] + T.R[2][2] * f[2] + T.t[2]
    ];
  }

  function composeAffine(A, B) {
    /*
      A ∘ B:
      first B, then A

      f' = A.R * (B.R*f + B.t) + A.t
         = (A.R*B.R)f + A.R*B.t + A.t
    */

    return {
      R: matMul3(A.R, B.R),
      t: add3(matVec3(A.R, B.t), A.t),
      code: ""
    };
  }

  function determinant3(A) {
    return (
      A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
      A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
      A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0])
    );
  }

  function inverseMatrix3(A) {
    var det = determinant3(A);

    if (Math.abs(det) < 1e-12) {
      return [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
    }

    var invDet = 1 / det;

    return [
      [
        (A[1][1] * A[2][2] - A[1][2] * A[2][1]) * invDet,
        (A[0][2] * A[2][1] - A[0][1] * A[2][2]) * invDet,
        (A[0][1] * A[1][2] - A[0][2] * A[1][1]) * invDet
      ],
      [
        (A[1][2] * A[2][0] - A[1][0] * A[2][2]) * invDet,
        (A[0][0] * A[2][2] - A[0][2] * A[2][0]) * invDet,
        (A[0][2] * A[1][0] - A[0][0] * A[1][2]) * invDet
      ],
      [
        (A[1][0] * A[2][1] - A[1][1] * A[2][0]) * invDet,
        (A[0][1] * A[2][0] - A[0][0] * A[2][1]) * invDet,
        (A[0][0] * A[1][1] - A[0][1] * A[1][0]) * invDet
      ]
    ];
  }

  function inverseAffine(T) {
    var Rinv = inverseMatrix3(T.R);

    return {
      R: Rinv,
      t: scale3(matVec3(Rinv, T.t), -1),
      code: ""
    };
  }

  function positionKey(label, fract) {
    return [
      label,
      fract[0].toFixed(5),
      fract[1].toFixed(5),
      fract[2].toFixed(5)
    ].join("|");
  }

  function makeAtomInstance(model, label, symCode) {
    var source = model.atomByLabel[label];

    if (!source) {
      return null;
    }

    var fract = source.fract.slice();
    var symMatrix = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];

    if (!isIdentitySymCode(symCode)) {
      var parsedCode = parseSymCode(symCode);
      var operation = getSymOperation(model, parsedCode.opId);
      var symParsed = parseSymOperation(operation);

      fract = applySymToFractional(source.fract, symParsed, parsedCode.translation);
      symMatrix = symParsedToMatrix(symParsed);
    }

    var cart = fracToCart(model.M, fract);

    return {
      key: [
        label,
        symCode || "",
        fract[0].toFixed(5),
        fract[1].toFixed(5),
        fract[2].toFixed(5)
      ].join("|"),
      label: source.label,
      element: source.element,
      sourceLabel: source.label,
      sourceId: source.sourceId,
      sourceIndex: source.sourceIndex,
      symCode: symCode || "",
      fract: fract,
      cart: cart,
      adp: source.adp,
      uiso: source.uiso,
      adpType: source.adpType,
      occupancy: source.occupancy,
      disorderAssembly: source.disorderAssembly,
      disorderGroup: source.disorderGroup,
      symMatrix: symMatrix
    };
  }

  function makeAtomInstanceFromSourceTransform(model, source, transform, displayCode) {
    if (!source) {
      return null;
    }
  
    var fract = applyAffine(transform, source.fract);
    var cart = fracToCart(model.M, fract);
  
    return {
      key: positionKey(source.sourceId || source.label, fract),
  
      label: source.label,
      element: source.element,
      sourceLabel: source.label,
      sourceId: source.sourceId,
      sourceIndex: source.sourceIndex,
  
      symCode: displayCode || transform.code || "",
  
      fract: fract,
      cart: cart,
  
      adp: source.adp,
      uiso: source.uiso,
      adpType: source.adpType,
      occupancy: source.occupancy,
      disorderAssembly: source.disorderAssembly,
      disorderGroup: source.disorderGroup,
  
      transform: transform,
      symMatrix: transform.R
    };
  }

  function makeAtomInstanceFromTransform(model, label, transform, displayCode) {
    var source = model.atomByLabel[label];
  
    return makeAtomInstanceFromSourceTransform(
      model,
      source,
      transform,
      displayCode
    );
  }

  function assignDisplayLabelsAndSymmetryNotes(fragment) {
    var symbolBySignature = {};
    var notes = [];
    var symbolCount = 0;
  
    (fragment.atoms || []).forEach(function (atom) {
      var T = atom.transform || identityTransform();
  
      atom.displayLabel = atom.label;
  
      if (affineIsIdentity(T)) {
        atom.symmetrySymbol = "";
        return;
      }
  
      var signature = affineSignature(T);
  
      if (!symbolBySignature[signature]) {
        symbolCount++;
  
        var symbol = roman(symbolCount);
        symbolBySignature[signature] = symbol;
  
        notes.push({
          symbol: symbol,
          textSymbol: symmetrySymbolText(symbol),
          signature: signature,
          operation: formatAffineOperation(T),
          code: atom.symCode || ""
        });
      }
  
      atom.symmetrySymbol = symbolBySignature[signature];
      atom.displayLabel = atom.label + symmetrySymbolText(atom.symmetrySymbol);
    });
  
    fragment.symmetryNotes = notes;
  
    return fragment;
  }

  function distance3(a, b) {
    var dx = a[0] - b[0];
    var dy = a[1] - b[1];
    var dz = a[2] - b[2];

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function makeFragmentForCenter(model, centerLabel, options) {
    options = options || {};

    var showHydrogen = options.showHydrogen !== false;
    var center = makeAtomInstance(model, centerLabel, "");

    if (!center) {
      throw new Error("Center atom not found: " + centerLabel);
    }

    var ligands = [];
    var bonds = [];
    var seenLigands = {};

    model.bonds.forEach(function (bond) {
      var ligandLabel = "";
      var ligandSym = "";
      var centerSym = "";

      if (bond.atom1Label === centerLabel) {
        ligandLabel = bond.atom2Label;
        ligandSym = bond.sym2Code || "";
        centerSym = bond.sym1Code || "";
      } else if (bond.atom2Label === centerLabel) {
        ligandLabel = bond.atom1Label;
        ligandSym = bond.sym1Code || "";
        centerSym = bond.sym2Code || "";
      } else {
        return;
      }

      /*
        Prototype rule:
        center is displayed as the ASU atom.
        If a bond refers to a symmetry-generated image of the center,
        skip it for now.
      */
      if (!isIdentitySymCode(centerSym)) {
        return;
      }

      var ligand = makeAtomInstance(model, ligandLabel, ligandSym);

      if (!ligand) {
        return;
      }

      if (!showHydrogen && ligand.element === "H") {
        return;
      }

      var distance = isFinite(bond.distance)
        ? bond.distance
        : distance3(center.cart, ligand.cart);

      ligand.distance = distance;
      ligand.cifValue = bond.value || "";
      ligand.bondId = bond.id || "";

      if (!seenLigands[ligand.key]) {
        seenLigands[ligand.key] = true;
        ligands.push(ligand);
      }

      bonds.push({
        atom1Key: center.key,
        atom2Key: ligand.key,
        distance: distance,
        cifValue: bond.value || ""
      });
    });

    ligands.sort(function (a, b) {
      return distance3(center.cart, a.cart) - distance3(center.cart, b.cart);
    });

    return assignDisplayLabelsAndSymmetryNotes({
      center: center,
      ligands: ligands,
      atoms: [center].concat(ligands),
      bonds: bonds,
      _model: model
    });
  }

  function makeBondedComponentForAtom(model, startLabel, options) {
    options = options || {};

    var showHydrogen = options.showHydrogen !== false;
    var addMissingHydrogenAtoms = options.addMissingHydrogenAtoms === true;
    var maxAtoms = options.maxAtoms || 200;
    var maxDepth = options.maxDepth || 12;
    var maxRadius = options.maxRadius || 20;

    var startTransform = identityTransform();
    var start = makeAtomInstanceFromTransform(model, startLabel, startTransform, "");

    if (!start) {
      throw new Error("Start atom not found: " + startLabel);
    }

    var atoms = [];
    var bonds = [];
    var atomMap = {};
    var bondMap = {};
    var queue = [];
    var truncated = false;
    var messages = [];
    
    function findEquivalentExistingAtom(instance) {
      var tolerance = 0.01;

      for (var i = 0; i < atoms.length; i++) {
        var existing = atoms[i];

        /*
          Only merge images of the same crystallographic atom.
          This prevents unrelated atoms at similar positions from being merged.
        */
        var existingSourceId = existing.sourceId || existing.sourceLabel;
        var instanceSourceId = instance.sourceId || instance.sourceLabel;
        
        if (existingSourceId !== instanceSourceId) {
          continue;
        }

        /*
          ORTEP drawing uses the actual generated Cartesian positions.

          Do not reduce by whole-cell translations here:
          two instances that differ by one unit-cell translation may be
          crystallographically equivalent, but they are not the same drawn
          atom in the local fragment. Merging them can create very long,
          wrong bonds.
        */
        if (distance3(existing.cart, instance.cart) < tolerance) {
          return existing;
        }
      }

      return null;
    }

    function addAtom(instance, depth) {
      if (!instance) {
        return false;
      }
    
      if (!showHydrogen && instance.element === "H") {
        return false;
      }
    
      /*
        Do not add a new atom if an equivalent image of the same atom label
        already exists at the same physical position.
        This handles atoms on special positions.
      */
      if (findEquivalentExistingAtom(instance)) {
        return false;
      }
    
      var dFromStart = distance3(start.cart, instance.cart);
    
      if (dFromStart > maxRadius) {
        truncated = true;
        return false;
      }
    
      if (!atomMap[instance.key]) {
        if (atoms.length >= maxAtoms) {
          truncated = true;
          return false;
        }

        atomMap[instance.key] = instance;
        atoms.push(instance);

        /*
          Attach coordinate H atoms that are present in the CIF but absent
          from the CIF geometry bond expansion.
        */
        addAttachedHydrogens(instance, depth);

        if (depth < maxDepth) {
          queue.push({
            atom: instance,
            depth: depth
          });
        } else {
          truncated = true;
        }

        return true;
      }

      return false;
    }

    function addBond(a, b, sourceBond) {
      if (!a || !b) {
        return;
      }

      var key = [a.key, b.key].sort().join("::");

      if (bondMap[key]) {
        return;
      }

      bondMap[key] = true;

      bonds.push({
        atom1Key: a.key,
        atom2Key: b.key,
        distance: isFinite(sourceBond.distance)
          ? sourceBond.distance
          : distance3(a.cart, b.cart),
        cifValue: sourceBond.value || "",
        sourceBondId: sourceBond.id || ""
      });
    }

    function addAttachedHydrogens(parentInstance, depth) {
      if (!addMissingHydrogenAtoms) {
        return;
      }

      if (!parentInstance || parentInstance.element === "H") {
        return;
      }

      var attached = model.attachedHydrogensByParent || {};
      var parentId = parentInstance.sourceId || parentInstance.sourceLabel;
      var hydrogenIds = attached[parentId] || [];
      
      hydrogenIds.forEach(function (hydrogenId) {
        var transform = parentInstance.transform || identityTransform();
      
        var hydrogenSource = model.atomBySourceId
          ? model.atomBySourceId[hydrogenId]
          : null;
      
        /*
          Backwards fallback for older data structures.
        */
        if (!hydrogenSource && model.atomByLabel) {
          hydrogenSource = model.atomByLabel[hydrogenId];
        }
      
        var hydrogen = makeAtomInstanceFromSourceTransform(
          model,
          hydrogenSource,
          transform,
          parentInstance.symCode || ""
        );

        if (!hydrogen) {
          return;
        }
        
        hydrogen.attachedToAtomKey = parentInstance.key;

        if (!showHydrogen && hydrogen.element === "H") {
          return;
        }

        var known = atomMap[hydrogen.key];

        if (known) {
          addBond(parentInstance, known, {
            id: "inferred-h",
            value: "",
            distance: distance3(parentInstance.cart, known.cart)
          });

          return;
        }

        var equivalent = findEquivalentExistingAtom(hydrogen);

        if (equivalent) {
          addBond(parentInstance, equivalent, {
            id: "inferred-h",
            value: "",
            distance: distance3(parentInstance.cart, equivalent.cart)
          });

          return;
        }

        if (addAtom(hydrogen, depth + 1)) {
          addBond(parentInstance, hydrogen, {
            id: "inferred-h",
            value: "",
            distance: distance3(parentInstance.cart, hydrogen.cart)
          });
        }
      });
    }

    addAtom(start, 0);

    while (queue.length) {
      var item = queue.shift();
      var current = item.atom;
      var depth = item.depth;

      model.bonds.forEach(function (bond) {
        var currentEndpointSym;
        var otherEndpointSym;
        var otherLabel;

        if (bond.atom1Label === current.sourceLabel) {
          currentEndpointSym = bond.sym1Code || "";
          otherEndpointSym = bond.sym2Code || "";
          otherLabel = bond.atom2Label;
        } else if (bond.atom2Label === current.sourceLabel) {
          currentEndpointSym = bond.sym2Code || "";
          otherEndpointSym = bond.sym1Code || "";
          otherLabel = bond.atom1Label;
        } else {
          return;
        }

        var Scur = affineFromSymCode(model, currentEndpointSym);
        var Sother = affineFromSymCode(model, otherEndpointSym);

        /*
          The CIF bond is Scur(currentLabel) — Sother(otherLabel)
          in a local reference frame.

          Current instance is G(currentLabel).

          We need K such that:
            K ∘ Scur = G

          Therefore:
            K = G ∘ inverse(Scur)

          Other instance:
            K ∘ Sother(otherLabel)
        */

        var G = current.transform || identityTransform();
        var K = composeAffine(G, inverseAffine(Scur));
        var otherTransform = composeAffine(K, Sother);

        var other = makeAtomInstanceFromTransform(
          model,
          otherLabel,
          otherTransform,
          otherEndpointSym
        );

        if (!other) {
          return;
        }

        if (!showHydrogen && other.element === "H") {
          return;
        }

        var known = atomMap[other.key];
        
        if (known) {
          addBond(current, known, bond);
          return;
        }
        
        var equivalent = findEquivalentExistingAtom(other);
        
        if (equivalent) {
          addBond(current, equivalent, bond);
          return;
        }
        
        if (addAtom(other, depth + 1)) {
          addBond(current, other, bond);
        }
      });
    }

    if (truncated) {
      messages.push(
        "The bonded component reached one of the expansion limits. " +
        "This may indicate an extended or periodic bonded network."
      );
    }

    return assignDisplayLabelsAndSymmetryNotes({
      start: start,
      center: start,
      atoms: atoms,
      ligands: atoms.filter(function (atom) {
        return atom.key !== start.key;
      }),
      bonds: bonds,
      truncated: truncated,
      messages: messages,
      _model: model
    });
  }

  /*
    Linear algebra
  */

  function dot3(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  function norm3(a) {
    return Math.sqrt(dot3(a, a));
  }

  function normalize3(a) {
    var n = norm3(a);

    if (n < 1e-14) {
      return [0, 0, 0];
    }

    return [
      a[0] / n,
      a[1] / n,
      a[2] / n
    ];
  }

  function add3(a, b) {
    return [
      a[0] + b[0],
      a[1] + b[1],
      a[2] + b[2]
    ];
  }

  function sub3(a, b) {
    return [
      a[0] - b[0],
      a[1] - b[1],
      a[2] - b[2]
    ];
  }

  function scale3(a, s) {
    return [
      a[0] * s,
      a[1] * s,
      a[2] * s
    ];
  }

  function cross3(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function rotateVectorAroundAxis(v, axis, angle) {
    axis = normalize3(axis);

    var c = Math.cos(angle);
    var s = Math.sin(angle);

    var term1 = scale3(v, c);
    var term2 = scale3(cross3(axis, v), s);
    var term3 = scale3(axis, dot3(axis, v) * (1 - c));

    return add3(add3(term1, term2), term3);
  }

  function orthonormalizeView(view) {
    var z = normalize3(view.z);
    var x = normalize3(view.x);

    /*
      Remove any x component along z.
    */
    x = normalize3(sub3(x, scale3(z, dot3(x, z))));

    if (norm3(x) < 1e-10) {
      x = Math.abs(z[2]) > 0.95
        ? normalize3(cross3([0, 1, 0], z))
        : normalize3(cross3([0, 0, 1], z));
    }

    var y = normalize3(cross3(z, x));

    return {
      x: x,
      y: y,
      z: z
    };
  }

  function rotateView(view, dx, dy, sensitivity) {
    sensitivity = sensitivity || 0.008;

    var ax = dx * sensitivity;
    var ay = dy * sensitivity;

    var x = view.x.slice();
    var y = view.y.slice();
    var z = view.z.slice();

    /*
      Horizontal mouse movement:
      yaw around current view Y axis.

      Vertical mouse movement:
      pitch around current view X axis.
    */
    x = rotateVectorAroundAxis(x, y, ax);
    z = rotateVectorAroundAxis(z, y, ax);

    y = rotateVectorAroundAxis(y, x, ay);
    z = rotateVectorAroundAxis(z, x, ay);

    return orthonormalizeView({
      x: x,
      y: y,
      z: z
    });
  }

  function matMul3(A, B) {
    var C = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ];

    for (var i = 0; i < 3; i++) {
      for (var k = 0; k < 3; k++) {
        for (var j = 0; j < 3; j++) {
          C[i][j] += A[i][k] * B[k][j];
        }
      }
    }

    return C;
  }

  function transpose3(A) {
    return [
      [A[0][0], A[1][0], A[2][0]],
      [A[0][1], A[1][1], A[2][1]],
      [A[0][2], A[1][2], A[2][2]]
    ];
  }

  function matVec3(A, v) {
    return [
      A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2],
      A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2],
      A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]
    ];
  }

  function eigenSym3(A) {
    var a = [
      [A[0][0], A[0][1], A[0][2]],
      [A[1][0], A[1][1], A[1][2]],
      [A[2][0], A[2][1], A[2][2]]
    ];

    var V = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ];

    for (var iter = 0; iter < 80; iter++) {
      var p = 0;
      var q = 1;
      var max = Math.abs(a[0][1]);

      var a02 = Math.abs(a[0][2]);
      if (a02 > max) {
        max = a02;
        p = 0;
        q = 2;
      }

      var a12 = Math.abs(a[1][2]);
      if (a12 > max) {
        max = a12;
        p = 1;
        q = 2;
      }

      if (max < 1e-14) {
        break;
      }

      var app = a[p][p];
      var aqq = a[q][q];
      var apq = a[p][q];

      var tau = (aqq - app) / (2 * apq);
      var t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
      var c = 1 / Math.sqrt(1 + t * t);
      var s = t * c;

      for (var k = 0; k < 3; k++) {
        if (k !== p && k !== q) {
          var akp = a[k][p];
          var akq = a[k][q];

          a[k][p] = c * akp - s * akq;
          a[p][k] = a[k][p];

          a[k][q] = s * akp + c * akq;
          a[q][k] = a[k][q];
        }
      }

      var newApp = c * c * app - 2 * s * c * apq + s * s * aqq;
      var newAqq = s * s * app + 2 * s * c * apq + c * c * aqq;

      a[p][p] = newApp;
      a[q][q] = newAqq;
      a[p][q] = 0;
      a[q][p] = 0;

      for (k = 0; k < 3; k++) {
        var vkp = V[k][p];
        var vkq = V[k][q];

        V[k][p] = c * vkp - s * vkq;
        V[k][q] = s * vkp + c * vkq;
      }
    }

    return {
      vals: [a[0][0], a[1][1], a[2][2]],
      vecs: V
    };
  }

  /*
    ADP / ellipsoid
  */

  var probabilityChiSquare3 = {
    30: 1.42365,
    50: 2.36597,
    70: 3.66487,
    90: 6.25139
  };

  function adpToMatrix(adp) {
    return [
      [adp.u11, adp.u12, adp.u13],
      [adp.u12, adp.u22, adp.u23],
      [adp.u13, adp.u23, adp.u33]
    ];
  }

  function transformAdpToCartesian(model, atomInstance) {
    if (!atomInstance.adp) {
      return null;
    }

    /*
      Prototype approximation:
      - Uij are treated as displacement components in the crystallographic basis.
      - The unit-cell direction basis maps these components into Cartesian view space.
      - Symmetry rotation is applied in fractional/crystallographic coordinates.

      This should be validated against known ORTEP output.
    */

    var U = adpToMatrix(atomInstance.adp);

    if (atomInstance.symMatrix) {
      U = matMul3(
        matMul3(atomInstance.symMatrix, U),
        transpose3(atomInstance.symMatrix)
      );
    }

    var B = model.basisUnit;

    return matMul3(
      matMul3(B, U),
      transpose3(B)
    );
  }

  function ellipsoidAxes(model, atomInstance, probability, visualScale) {
    var Ucart = transformAdpToCartesian(model, atomInstance);

    if (!Ucart) {
      return null;
    }

    var eig = eigenSym3(Ucart);
    var order = [0, 1, 2].sort(function (a, b) {
      return eig.vals[b] - eig.vals[a];
    });

    var scale = Math.sqrt(probabilityChiSquare3[probability] || probabilityChiSquare3[50]);
    scale *= visualScale || 1;

    var axes = [];

    order.forEach(function (idx) {
      var value = eig.vals[idx];

      if (!isFinite(value) || value <= 0) {
        return;
      }

      var length = scale * Math.sqrt(value);
      var vec = [
        eig.vecs[0][idx],
        eig.vecs[1][idx],
        eig.vecs[2][idx]
      ];

      axes.push(scale3(normalize3(vec), length));
    });

    if (axes.length !== 3) {
      return null;
    }

    return axes;
  }

  /*
    Projection / view optimisation
  */

  function centroid(points) {
    var c = [0, 0, 0];

    points.forEach(function (p) {
      c[0] += p[0];
      c[1] += p[1];
      c[2] += p[2];
    });

    c[0] /= points.length || 1;
    c[1] /= points.length || 1;
    c[2] /= points.length || 1;

    return c;
  }

  function makeViewFromAngles(theta, phi, roll) {
    var st = Math.sin(theta);
    var ct = Math.cos(theta);
    var sp = Math.sin(phi);
    var cp = Math.cos(phi);

    var viewZ = normalize3([
      st * cp,
      st * sp,
      ct
    ]);

    var up = Math.abs(viewZ[2]) > 0.95
      ? [0, 1, 0]
      : [0, 0, 1];

    var viewX = normalize3(cross3(up, viewZ));
    var viewY = normalize3(cross3(viewZ, viewX));

    var cr = Math.cos(roll);
    var sr = Math.sin(roll);

    var rx = add3(scale3(viewX, cr), scale3(viewY, sr));
    var ry = add3(scale3(viewX, -sr), scale3(viewY, cr));

    return {
      x: normalize3(rx),
      y: normalize3(ry),
      z: viewZ
    };
  }

  function projectPoint(p, view, center) {
    var q = sub3(p, center);

    return {
      x: dot3(q, view.x),
      y: dot3(q, view.y),
      z: dot3(q, view.z)
    };
  }

  function projectedBBox(projected) {
    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;

    projected.forEach(function (p) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    return {
      minX: minX,
      maxX: maxX,
      minY: minY,
      maxY: maxY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  function estimateOverlap(projected, radii) {
    var penalty = 0;

    for (var i = 0; i < projected.length; i++) {
      for (var j = i + 1; j < projected.length; j++) {
        var dx = projected[i].x - projected[j].x;
        var dy = projected[i].y - projected[j].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        var required = (radii[i] || 0.15) + (radii[j] || 0.15);

        if (d < required) {
          var overlap = (required - d) / required;
          penalty += overlap * overlap;
        }
      }
    }

    return penalty;
  }

  function chooseBestView(atoms, radii) {
    var points = atoms.map(function (atom) {
      return atom.cart;
    });

    var c = centroid(points);
    var best = null;
    var targetAspect = 1.35;

    for (var thetaDeg = 20; thetaDeg <= 160; thetaDeg += 20) {
      for (var phiDeg = 0; phiDeg < 360; phiDeg += 20) {
        for (var rollDeg = 0; rollDeg < 180; rollDeg += 30) {
          var view = makeViewFromAngles(
            thetaDeg * Math.PI / 180,
            phiDeg * Math.PI / 180,
            rollDeg * Math.PI / 180
          );

          var projected = points.map(function (p) {
            return projectPoint(p, view, c);
          });

          var bbox = projectedBBox(projected);

          if (bbox.width < 1e-8 || bbox.height < 1e-8) {
            continue;
          }

          var aspect = bbox.width / bbox.height;
          var aspectPenalty = Math.abs(Math.log(aspect / targetAspect));
          var overlapPenalty = estimateOverlap(projected, radii);

          var score =
            Math.sqrt(bbox.width * bbox.height) +
            0.8 * Math.min(bbox.width, bbox.height) -
            2.0 * aspectPenalty -
            5.0 * overlapPenalty;

          if (!best || score > best.score) {
            best = {
              score: score,
              view: view,
              center: c
            };
          }
        }
      }
    }

    if (!best) {
      best = {
        score: 0,
        view: makeViewFromAngles(Math.PI / 3, Math.PI / 4, 0),
        center: c
      };
    }

    return best;
  }

  function makeViewState(fragment, options) {
    options = options || {};

    var atoms = fragment.atoms || [];

    if (!atoms.length) {
      return {
        view: makeViewFromAngles(Math.PI / 3, Math.PI / 4, 0),
        center: [0, 0, 0]
      };
    }

    var probability = options.probability || 50;
    var ellipsoidScale = options.ellipsoidScale || 1;
    var model = fragment._model || options.model;

    var radii = atoms.map(function (atom) {
      if (!model) {
        return atom.element === "H" ? 0.08 : 0.14;
      }

      var axes = ellipsoidAxes(model, atom, probability, ellipsoidScale);

      if (!axes) {
        return atom.element === "H" ? 0.08 : 0.14;
      }

      return Math.max(
        norm3(axes[0]),
        norm3(axes[1]),
        norm3(axes[2])
      );
    });

    var best = chooseBestView(atoms, radii);

    return {
      view: best.view,
      center: best.center
    };
  }

  /*
    SVG rendering
  */

  /*
    Element styles are provided by static/js/element-library.js.

    This wrapper keeps ortep-svg.js usable in isolation if the element library
    was not loaded, but normally CIFLord.Elements should exist.
  */

  function styleForElement(element) {
    if (CIFLord.Elements && CIFLord.Elements.styleForElement) {
      return CIFLord.Elements.styleForElement(element);
    }

    return {
      stroke: "#333333",
      fill: "#f5f5f5",
      ellipsoidWidth: 1.45,
      fallbackRadius: 0.15,
      fallbackStrokeWidth: 1.35,
      labelColor: "#111111",
      showRings: true
    };
  }

  function colorForElement(element) {
    if (CIFLord.Elements && CIFLord.Elements.colorForElement) {
      return CIFLord.Elements.colorForElement(element);
    }

    return styleForElement(element).stroke;
  }

  function makeRingPoints(center, axisA, axisB, steps) {
    var points = [];

    for (var i = 0; i <= steps; i++) {
      var t = 2 * Math.PI * i / steps;

      points.push(
        add3(
          center,
          add3(
            scale3(axisA, Math.cos(t)),
            scale3(axisB, Math.sin(t))
          )
        )
      );
    }

    return points;
  }

  function makeEllipsoidSurfacePoints(center, axes, latSteps, lonSteps) {
    var points = [];

    latSteps = latSteps || 12;
    lonSteps = lonSteps || 36;

    for (var i = 0; i <= latSteps; i++) {
      var theta = Math.PI * i / latSteps;
      var st = Math.sin(theta);
      var ct = Math.cos(theta);

      for (var j = 0; j < lonSteps; j++) {
        var phi = 2 * Math.PI * j / lonSteps;
        var cp = Math.cos(phi);
        var sp = Math.sin(phi);

        points.push(
          add3(
            center,
            add3(
              add3(
                scale3(axes[0], st * cp),
                scale3(axes[1], st * sp)
              ),
              scale3(axes[2], ct)
            )
          )
        );
      }
    }

    return points;
  }

  function convexHull2D(points) {
    var pts = points.filter(function (p) {
      return isFinite(p.x) && isFinite(p.y);
    }).slice();

    pts.sort(function (a, b) {
      if (a.x !== b.x) {
        return a.x - b.x;
      }

      return a.y - b.y;
    });

    var unique = [];

    pts.forEach(function (p) {
      var last = unique[unique.length - 1];

      if (
        !last ||
        Math.abs(last.x - p.x) > 1e-7 ||
        Math.abs(last.y - p.y) > 1e-7
      ) {
        unique.push(p);
      }
    });

    if (unique.length <= 2) {
      return unique;
    }

    function cross(o, a, b) {
      return (
        (a.x - o.x) * (b.y - o.y) -
        (a.y - o.y) * (b.x - o.x)
      );
    }

    var lower = [];

    unique.forEach(function (p) {
      while (
        lower.length >= 2 &&
        cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0
      ) {
        lower.pop();
      }

      lower.push(p);
    });

    var upper = [];

    for (var i = unique.length - 1; i >= 0; i--) {
      var p = unique[i];

      while (
        upper.length >= 2 &&
        cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0
      ) {
        upper.pop();
      }

      upper.push(p);
    }

    lower.pop();
    upper.pop();

    return lower.concat(upper);
  }

  function collectDrawingPoints(model, fragment, options) {
    var probability = options.probability || 50;
    var visualScale = options.ellipsoidScale || 1;
    var points = [];

    fragment.atoms.forEach(function (atom) {
      points.push(atom.cart);

      var axes = ellipsoidAxes(model, atom, probability, visualScale);

      if (axes) {
        /*
          Include sampled ellipsoid surface for correct bounding box of
          the filled projected silhouette.
        */
        makeEllipsoidSurfacePoints(atom.cart, axes, 12, 36).forEach(function (p) {
          points.push(p);
        });

        [
          [axes[0], axes[1]],
          [axes[0], axes[2]],
          [axes[1], axes[2]]
        ].forEach(function (pair) {
          makeRingPoints(atom.cart, pair[0], pair[1], 48).forEach(function (p) {
            points.push(p);
          });
        });
      }
    });

    return points;
  }

  function makeSvg(fragment, options) {
    options = options || {};

    var model = options.model || fragment.model;

    /*
      If called through public API, attach model to fragment externally.
    */
    if (!model && fragment._model) {
      model = fragment._model;
    }

    if (!model) {
      model = fragment.model;
    }

    if (!model) {
      throw new Error("Internal error: model missing for SVG generation.");
    }

    var width = options.width || 1100;
    var height = options.height || 800;
    var margin = options.margin || 55;
    var probability = options.probability || 50;
    var ellipsoidScale = options.ellipsoidScale || 1;
    var showLabels = options.showLabels !== false;
    var optimizeLabels = options.optimizeLabels !== false;
    var labelFontSize = options.labelFontSize || 14;
    var labelPadding = options.labelPadding == null ? 2.5 : options.labelPadding;
    var labelGap = options.labelGap == null ? 4 : options.labelGap;
    
    /*
      Negative value lets labels come closer to the ellipsoid outline.
      More negative = closer.
      Try -4, -6, -8.
    */
    var labelAtomClearance = options.labelAtomClearance == null ? -6 : options.labelAtomClearance;
    var labelHaloWidth = options.labelHaloWidth || 3.5;
    var labelLeaderLines = options.labelLeaderLines === true;

    /*
      If false, only front-facing ORTEP ring segments are drawn.
      Projection convention in this renderer:
      smaller z = closer to viewer.
    */
    var showBackfaces = options.showBackfaces === true;

    /*
      ORTEP/Mercury-like display parameters.
      You may tune these later from UI if desired.
    */
    /*
      Heavier ORTEP-like display parameters.
    */
    var bondColor = options.bondColor || "#111111";
    var bondHaloColor = options.bondHaloColor || "#ffffff";
    var twoColoredBonds = options.twoColoredBonds === true;

    /*
      Bond shadows are enabled by default.
      Dashed bonds still suppress shadows separately below.
    */
    var bondShadows = options.bondShadows !== false;

    /*
      Zero bond gap removes the white bond halo and clips the bond core
      exactly at the atom/ellipsoid boundary.
    */
    var zeroBondGap = options.zeroBondGap === true;

    /*
      Main bond thickness.
      Increase this for very bold ORTEP bonds.
    */
    var bondWidth = options.bondWidth || 3.4;

    /*
      White outline around bonds.
      This creates the hidden-line / foreground-cutout effect.
    */
    var bondHaloWidth = options.bondHaloWidth || 9.0;

    /*
      Bonds should stop at the visible atom/ellipsoid boundary.
      Positive value creates a tiny clean gap so antialiasing does not bleed
      into the filled ellipsoid.
    */
    var bondAtomGap = options.bondAtomGap == null ? 1.2 : options.bondAtomGap;

    /*
      Subtle grey offset underlay.
      Gives bonds a slightly shaded, printed-ORTEP look.
    */
    //var bondShadowColor = options.bondShadowColor || "#9ca3af";
    var bondShadowColor = options.bondShadowColor || "#d1d5db";
    var bondShadowWidth = options.bondShadowWidth || 4.4;
    var bondShadowDx = options.bondShadowDx || 0.75;
    var bondShadowDy = options.bondShadowDy || 0.75;

    /*
    Global fallback values. Element-specific values below override these.
    */
    var ellipsoidLineWidth = options.ellipsoidLineWidth || 1.35;
    var hydrogenEllipsoidLineWidth = options.hydrogenEllipsoidLineWidth || 0.7;
    var atomFallbackLineWidth = options.atomFallbackLineWidth || 1.25;

    /*
      Display options.

      These options are renderer-side on purpose, so the ORTEP engine can
      later be reused inside CIFLord Web with a different UI.

      displayOptions = {
        showHydrogen: true,

        labelCarbon: false,
        labelHydrogen: false,

        atomOverrides: {
          atomKey: {
            show: null | true | false,
            label: null | true | false
          }
        },

        bondOverrides: {
          bondKey: {
            show: null | true | false
          }
        }
      }
    */
    var displayOptions = options.displayOptions || {};
    var atomOverrides = displayOptions.atomOverrides || {};
    var bondOverrides = displayOptions.bondOverrides || {};

    var allAtoms = fragment.atoms || [];
    var allBonds = fragment.bonds || [];

    function atomOverrideFor(atom) {
      return atomOverrides[atom.key] || {};
    }

    function bondKey(bond) {
      return [bond.atom1Key, bond.atom2Key].sort().join("::");
    }

    function bondOverrideFor(bond) {
      return bondOverrides[bondKey(bond)] || {};
    }

    function isMetalElement(element) {
      if (CIFLord.Elements && CIFLord.Elements.isMetal) {
        return CIFLord.Elements.isMetal(element);
      }
    
      return false;
    }

    function atomVisible(atom) {
      var override = atomOverrideFor(atom);

      /*
        Individual atom visibility overrides global hydrogen visibility.
      */
      if (override.show === true) {
        return true;
      }

      if (override.show === false) {
        return false;
      }

      if (atom.element === "H" && displayOptions.showHydrogen === false) {
        return false;
      }

      return true;
    }

    function atomLabelVisible(atom) {
      var override = atomOverrideFor(atom);

      if (!atomVisible(atom)) {
        return false;
      }

      /*
        Individual label override wins over global label settings.
      */
      if (override.label === true) {
        return true;
      }

      if (override.label === false) {
        return false;
      }

      /*
        Global label policy:
        - metals are labelled
        - hetero atoms are labelled
        - carbon labels are optional
        - hydrogen labels are optional
      */
      if (isMetalElement(atom.element)) {
        return true;
      }

      if (atom.element === "C") {
        return !!displayOptions.labelCarbon;
      }

      if (atom.element === "H") {
        return !!displayOptions.labelHydrogen;
      }

      return true;
    }

    var atoms = allAtoms.filter(atomVisible);

    var visibleAtomKeys = {};

    atoms.forEach(function (atom) {
      visibleAtomKeys[atom.key] = true;
    });

    var visibleBonds = allBonds.filter(function (bond) {
      var aVisible = !!visibleAtomKeys[bond.atom1Key];
      var bVisible = !!visibleAtomKeys[bond.atom2Key];

      /*
        If one atom is hidden, the bond must disappear too.
      */
      if (!aVisible || !bVisible) {
        return false;
      }

      var override = bondOverrideFor(bond);

      if (override.show === false) {
        return false;
      }

      if (override.show === true) {
        return true;
      }

      return true;
    });

    var renderFragment = {
      atoms: atoms,
      bonds: visibleBonds,
      _model: fragment._model || model
    };

    var viewState = options.viewState || makeViewState(renderFragment, {
      probability: probability,
      ellipsoidScale: ellipsoidScale,
      model: model
    });

    var bestView = {
      view: viewState.view,
      center: viewState.center
    };

    var drawingPoints = collectDrawingPoints(model, renderFragment, {
      probability: probability,
      ellipsoidScale: ellipsoidScale
    });

    if (!drawingPoints.length) {
      drawingPoints = [[0, 0, 0]];
    }

    var projectedDrawing = drawingPoints.map(function (p) {
      return projectPoint(p, bestView.view, bestView.center);
    });

    var bbox = projectedBBox(projectedDrawing);

    if (bbox.width < 1e-8) {
      bbox.width = 1;
      bbox.maxX = bbox.minX + 1;
    }

    if (bbox.height < 1e-8) {
      bbox.height = 1;
      bbox.maxY = bbox.minY + 1;
    }

    var fitScale = Math.min(
      (width - 2 * margin) / bbox.width,
      (height - 2 * margin) / bbox.height
    );

    /*
      Projection scale:
      - default: auto-fit molecule into the fixed SVG canvas
      - fixedDrawingScale: use user-defined px/Å scale while keeping
        the SVG canvas size unchanged.

      In fixed mode, smaller moieties naturally get more white space and
      larger moieties may approach or exceed the canvas boundary. This is
      intentional for comparable figures.
    */
    var scale = fitScale;

    if (options.fixedDrawingScale === true) {
      var requestedScale = Number(options.projectionScale);

      if (isFinite(requestedScale) && requestedScale > 0) {
        scale = requestedScale;
      }
    }

    /*
      Automatic style scaling.

      The molecular coordinates are fitted to the SVG by `scale`.
      Small fragments get a large projection scale; large fragments get a
      smaller projection scale.

      The automatic factor keeps visual stroke widths useful across different
      molecular sizes. User controls are now separated into:
      - bondWidth for bonds, halos, and shadows
      - ortepLineScale for ellipsoid and fallback atom outline lines
    */
    var referenceProjectionScale = options.referenceProjectionScale || 90;

    var autoStyleScale = Math.pow(
      Math.max(scale, 1e-6) / referenceProjectionScale,
      0.45
    );

    /*
      Keep the automatic correction useful but not extreme.
    */
    autoStyleScale = Math.max(0.55, Math.min(1.80, autoStyleScale));

    /*
      Bond width is an explicit user-facing control.
      The value is interpreted as the base bond-core width before automatic
      projection-size correction.
    */
    var userBondWidth = Number(options.bondWidth);

    if (!isFinite(userBondWidth) || userBondWidth <= 0) {
      userBondWidth = bondWidth;
    }

    var baseBondWidth = 3.4;
    var baseHaloExtra = Math.max(0, bondHaloWidth - baseBondWidth);
    var baseShadowExtra = Math.max(0, bondShadowWidth - baseBondWidth);

    bondWidth = userBondWidth * autoStyleScale;

    /*
      The white halo follows the chosen bond width, but its additional
      margin scales more softly than the bond core.
    */
    bondHaloWidth =
      bondWidth +
      baseHaloExtra * Math.pow(autoStyleScale, 0.55);

    /*
      The grey shadow follows the chosen bond width more closely.
    */
    bondShadowWidth =
      bondWidth +
      baseShadowExtra * autoStyleScale;

    /*
      bondAtomGap is a screen-space clipping parameter, not a general style
      scale parameter.

      Zero bond gap:
      - disables the white bond halo
      - clips the bond core exactly at the atom/ellipsoid boundary

      Otherwise:
      - with bond shadows enabled, keep only a tiny positive gap
      - with bond shadows disabled, pull the bond slightly under the filled
        ellipsoid to avoid visible white gaps
    */
    if (zeroBondGap) {
      bondAtomGap = 0;
      bondHaloWidth = 0;
    } else if (bondShadows) {
      bondAtomGap = Math.max(0, Math.min(bondAtomGap, 0.8));
    } else {
      bondAtomGap = -Math.max(0.6, bondWidth * 0.35);
    }

    /*
      ORTEP line scale controls ellipsoid ring lines and fallback atom
      outline widths. Element-specific width differences are preserved.
    */
    var userOrtepLineScale = Number(options.ortepLineScale);

    if (!isFinite(userOrtepLineScale) || userOrtepLineScale <= 0) {
      userOrtepLineScale = 1;
    }

    var finalOrtepLineScale = autoStyleScale * userOrtepLineScale;

    /*
      Labels are controlled independently by labelFontSize.
      Bond width and ORTEP line scale should not change label size.
    */
    labelFontSize = Math.max(6, labelFontSize);

    var labelSizeScale = labelFontSize / 14;

    labelHaloWidth = Math.max(1.5, labelHaloWidth * labelSizeScale);
    labelPadding = Math.max(1.0, labelPadding * labelSizeScale);
    labelGap *= labelSizeScale;

    ellipsoidLineWidth *= finalOrtepLineScale;
    hydrogenEllipsoidLineWidth *= finalOrtepLineScale;
    atomFallbackLineWidth *= finalOrtepLineScale;
    
    var bboxCenterX = (bbox.minX + bbox.maxX) / 2;
    var bboxCenterY = (bbox.minY + bbox.maxY) / 2;
    
    var screenCenterX = width / 2;
    var screenCenterY = height / 2;
    
    function screenPoint(p3) {
      var p = projectPoint(p3, bestView.view, bestView.center);
    
      return {
        x: screenCenterX + (p.x - bboxCenterX) * scale,
        y: screenCenterY - (p.y - bboxCenterY) * scale,
    
        /*
          Important:
          In this projection convention, smaller z is closer to the viewer.
          The draw-sort below uses this convention.
        */
        z: p.z
      };
    }

    function polyline(points, stroke, strokeWidth) {
      var s = points.map(function (p) {
        var q = screenPoint(p);
        return q.x.toFixed(2) + "," + q.y.toFixed(2);
      }).join(" ");

      return "<polyline points=\"" + s +
        "\" fill=\"none\" stroke=\"" + stroke +
        "\" stroke-width=\"" + strokeWidth +
        "\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/>";
    }
    
    function polylineFromScreenPoints(points, stroke, strokeWidth) {
      if (!points || points.length < 2) {
        return "";
      }

      var s = points.map(function (p) {
        return p.x.toFixed(2) + "," + p.y.toFixed(2);
      }).join(" ");

      return "<polyline points=\"" + s +
        "\" fill=\"none\" stroke=\"" + stroke +
        "\" stroke-width=\"" + strokeWidth +
        "\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/>";
    }

    function ringPolylineSvg(points, stroke, strokeWidth, centerZ, renderBackfaces) {
      if (renderBackfaces) {
        return polyline(points, stroke, strokeWidth);
      }

      /*
        Hide rear half of each ORTEP ring.

        screenPoint(...).z uses the same projected z convention as sorting:
        smaller z = closer to viewer.

        Therefore visible/front ring points satisfy:
        point.z <= atomCenter.z
      */

      var projected = points.map(function (p) {
        return screenPoint(p);
      });

      var out = "";
      var segment = [];

      function isFront(p) {
        return p.z <= centerZ + 1e-7;
      }

      function addPoint(seg, p) {
        var last = seg[seg.length - 1];

        if (
          !last ||
          Math.abs(last.x - p.x) > 1e-6 ||
          Math.abs(last.y - p.y) > 1e-6
        ) {
          seg.push(p);
        }
      }

      function flush() {
        if (segment.length >= 2) {
          out += polylineFromScreenPoints(segment, stroke, strokeWidth);
        }

        segment = [];
      }

      for (var i = 0; i < projected.length - 1; i++) {
        var a = projected[i];
        var b = projected[i + 1];

        var af = isFront(a);
        var bf = isFront(b);

        if (af) {
          addPoint(segment, a);
        }

        /*
          If segment crosses the front/back boundary,
          add an interpolated point exactly at z = centerZ.
        */
        if (af !== bf && Math.abs(b.z - a.z) > 1e-9) {
          var t = (centerZ - a.z) / (b.z - a.z);

          if (t >= 0 && t <= 1) {
            var mid = {
              x: a.x + (b.x - a.x) * t,
              y: a.y + (b.y - a.y) * t,
              z: centerZ
            };

            addPoint(segment, mid);
          }

          if (af && !bf) {
            flush();
          } else if (!af && bf) {
            segment = [];

            if (t >= 0 && t <= 1) {
              addPoint(segment, {
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                z: centerZ
              });
            }
          }
        }

        if (bf) {
          addPoint(segment, b);
        }
      }

      flush();

      return out;
    }

    function makeLineSvg(x1, y1, x2, y2, stroke, strokeWidth, lineCap, dashArray) {
      lineCap = lineCap || "round";

      var dash = dashArray
        ? " stroke-dasharray=\"" + dashArray + "\""
        : "";
    
      return "<line x1=\"" + x1 +
        "\" y1=\"" + y1 +
        "\" x2=\"" + x2 +
        "\" y2=\"" + y2 +
        "\" stroke=\"" + stroke +
        "\" stroke-width=\"" + strokeWidth +
        "\" stroke-linecap=\"" + lineCap + "\"" +
        dash +
        "/>";
    }
    
    function makeBondHitSvg(bond, x1, y1, x2, y2) {
      return "<line " +
        "data-bond-key=\"" + escapeXml(bondKey(bond)) + "\" " +
        "x1=\"" + x1 + "\" " +
        "y1=\"" + y1 + "\" " +
        "x2=\"" + x2 + "\" " +
        "y2=\"" + y2 + "\" " +
        "stroke=\"transparent\" " +
        "stroke-width=\"16\" " +
        "stroke-linecap=\"round\" " +
        "pointer-events=\"stroke\"/>";
    }
    
    function makeAtomHitSvg(atom, centerProjected) {
      var style = styleForElement(atom.element);
      var r = Math.max(12, (style.fallbackRadius || 0.14) * scale * 1.4);
    
      return "<circle " +
        "data-atom-key=\"" + escapeXml(atom.key) + "\" " +
        "cx=\"" + centerProjected.x.toFixed(2) + "\" " +
        "cy=\"" + centerProjected.y.toFixed(2) + "\" " +
        "r=\"" + r.toFixed(2) + "\" " +
        "fill=\"transparent\" " +
        "pointer-events=\"all\"/>";
    }

    function polygonSvg(points, fill, stroke, strokeWidth) {
      if (!points || points.length < 3) {
        return "";
      }

      var s = points.map(function (p) {
        return p.x.toFixed(2) + "," + p.y.toFixed(2);
      }).join(" ");

      return "<polygon points=\"" + s +
        "\" fill=\"" + fill +
        "\" fill-opacity=\"1\" stroke=\"" + stroke +
        "\" stroke-width=\"" + strokeWidth +
        "\" stroke-linejoin=\"round\"/>";
    }

    function filledEllipsoidSvg(atom, axes, style) {
      var hull = projectedEllipsoidHull(atom, axes);

      return polygonSvg(
        hull,
        style.fill || "#f5f5f5",
        style.stroke || "#333333",
        Math.max(
          0.8 * finalOrtepLineScale,
          (style.ellipsoidWidth || 1.2) * 0.75 * finalOrtepLineScale
        )
      );
    }

    /*
      Caches for projected ellipsoid silhouettes.
      They are used both for filled ellipsoid rendering and for bond clipping.
    */
    var axesCache = {};
    var projectedHullCache = {};

    function getAxesForAtom(atom) {
      if (!Object.prototype.hasOwnProperty.call(axesCache, atom.key)) {
        axesCache[atom.key] =
          ellipsoidAxes(model, atom, probability, ellipsoidScale) || null;
      }

      return axesCache[atom.key];
    }

    function projectedEllipsoidHull(atom, axes) {
      if (!axes) {
        return null;
      }

      if (!projectedHullCache[atom.key]) {
        var surface = makeEllipsoidSurfacePoints(atom.cart, axes, 14, 42);

        var projected = surface.map(function (p) {
          return screenPoint(p);
        });

        projectedHullCache[atom.key] = convexHull2D(projected);
      }

      return projectedHullCache[atom.key];
    }

    function segmentIntersectionParameter(p, q, a, b) {
      /*
        Returns t for:
          p + t * (q - p)
        if the segment p-q intersects segment a-b.
      */

      var rx = q.x - p.x;
      var ry = q.y - p.y;
      var sx = b.x - a.x;
      var sy = b.y - a.y;

      var denom = rx * sy - ry * sx;

      if (Math.abs(denom) < 1e-9) {
        return null;
      }

      var axp = a.x - p.x;
      var ayp = a.y - p.y;

      var t = (axp * sy - ayp * sx) / denom;
      var u = (axp * ry - ayp * rx) / denom;

      if (
        t >= -1e-7 &&
        t <= 1 + 1e-7 &&
        u >= -1e-7 &&
        u <= 1 + 1e-7
      ) {
        return t;
      }

      return null;
    }

    function clipPointToPolygonBoundary(center, other, polygon, gapPx) {
      if (!polygon || polygon.length < 3) {
        return center;
      }

      var bestT = Infinity;

      for (var i = 0; i < polygon.length; i++) {
        var a = polygon[i];
        var b = polygon[(i + 1) % polygon.length];

        var t = segmentIntersectionParameter(center, other, a, b);

        /*
          We start inside the convex hull and move toward the other atom.
          The first positive intersection is the visible boundary.
        */
        if (t !== null && t > 1e-6 && t < bestT) {
          bestT = t;
        }
      }

      if (!isFinite(bestT)) {
        return center;
      }

      var dx = other.x - center.x;
      var dy = other.y - center.y;
      var d = Math.sqrt(dx * dx + dy * dy);

      if (d < 1e-6) {
        return center;
      }

      /*
        Move a tiny bit outside the atom shape.
        This avoids antialiasing artefacts where the bond appears to enter
        the filled ellipsoid by half a pixel.
      */
      var tWithGap = bestT + (gapPx || 0) / d;

      if (tWithGap > 1) {
        tWithGap = bestT;
      }

      return {
        x: center.x + dx * tWithGap,
        y: center.y + dy * tWithGap,
        z: center.z
      };
    }

    function clipBondEndpointToAtomWithGap(atom, centerPoint, otherPoint, gapPx) {
      var axes = getAxesForAtom(atom);

      /*
        Anisotropic atom: clip against projected filled ellipsoid hull.
      */
      if (axes) {
        return clipPointToPolygonBoundary(
          centerPoint,
          otherPoint,
          projectedEllipsoidHull(atom, axes),
          gapPx
        );
      }

      /*
        Fallback isotropic/no-ADP atom: clip against projected circle.
      */
      var style = styleForElement(atom.element);
      var r = (style.fallbackRadius || 0.14) * scale;
      var dx = otherPoint.x - centerPoint.x;
      var dy = otherPoint.y - centerPoint.y;
      var d = Math.sqrt(dx * dx + dy * dy);

      if (d < 1e-6) {
        return centerPoint;
      }

      var t = (r + gapPx) / d;

      if (t > 0.45) {
        t = 0.45;
      }

      return {
        x: centerPoint.x + dx * t,
        y: centerPoint.y + dy * t,
        z: centerPoint.z
      };
    }

    function clipBondEndpointToAtom(atom, centerPoint, otherPoint) {
      return clipBondEndpointToAtomWithGap(
        atom,
        centerPoint,
        otherPoint,
        bondAtomGap
      );
    }

    var atomByKey = {};
    atoms.forEach(function (atom) {
      atomByKey[atom.key] = atom;
    });

    function estimateTextWidth(text, fontSize) {
      /*
        Rough but stable SVG text-width estimate.
        Good enough for chemical labels.
      */
      return String(text || "").length * fontSize * 0.62;
    }

    function bboxOfPoints(points, inflate) {
      var minX = Infinity;
      var maxX = -Infinity;
      var minY = Infinity;
      var maxY = -Infinity;

      points.forEach(function (p) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      });

      inflate = inflate || 0;

      return {
        minX: minX - inflate,
        maxX: maxX + inflate,
        minY: minY - inflate,
        maxY: maxY + inflate
      };
    }

    function inflateBBox(b, amount) {
      return {
        minX: b.minX - amount,
        maxX: b.maxX + amount,
        minY: b.minY - amount,
        maxY: b.maxY + amount
      };
    }

    function bboxOverlapArea(a, b) {
      var x = Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX));
      var y = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));

      return x * y;
    }

    function bboxOutOfCanvasPenalty(b) {
      var penalty = 0;

      if (b.minX < 0) penalty += (0 - b.minX) * 20;
      if (b.minY < 0) penalty += (0 - b.minY) * 20;
      if (b.maxX > width) penalty += (b.maxX - width) * 20;
      if (b.maxY > height) penalty += (b.maxY - height) * 20;

      return penalty;
    }

    function labelBBox(x, y, text, fontSize, padding) {
      var w = estimateTextWidth(text, fontSize);
      var h = fontSize;

      /*
        x/y is SVG text baseline origin.
      */
      return {
        minX: x - padding,
        maxX: x + w + padding,
        minY: y - h - padding,
        maxY: y + fontSize * 0.25 + padding,
        width: w + 2 * padding,
        height: h + fontSize * 0.25 + 2 * padding
      };
    }

    function atomVisualBBox(atom) {
      var center = screenPoint(atom.cart);
      var axes = getAxesForAtom(atom);

      if (axes) {
        var hull = projectedEllipsoidHull(atom, axes);

        if (hull && hull.length) {
          return bboxOfPoints(hull, labelAtomClearance);
        }
      }

      var style = styleForElement(atom.element);
      var r = (style.fallbackRadius || 0.14) * scale;

      var rr = Math.max(1, r + labelAtomClearance);
      
      return {
        minX: center.x - rr,
        maxX: center.x + rr,
        minY: center.y - rr,
        maxY: center.y + rr
      };
    }

    function bondVisualBBox(bond) {
      var a = atomByKey[bond.atom1Key];
      var b = atomByKey[bond.atom2Key];

      if (!a || !b) {
        return null;
      }

      var pa = screenPoint(a.cart);
      var pb = screenPoint(b.cart);
      var inflate = Math.max(4, bondHaloWidth * 0.55);

      return {
        minX: Math.min(pa.x, pb.x) - inflate,
        maxX: Math.max(pa.x, pb.x) + inflate,
        minY: Math.min(pa.y, pb.y) - inflate,
        maxY: Math.max(pa.y, pb.y) + inflate
      };
    }

    /*
      Precise bond geometry for label collision checks.

      bondVisualBBox() above returns the axis-aligned bounding box of the
      bond's endpoints. That is a good approximation of the rendered stroke
      for roughly horizontal/vertical bonds (the bbox is a thin strip), but
      for diagonal bonds (NE/SE/SW/NW) it balloons into a large square that
      covers most of the space between the two atoms - far more than the
      actual thin line. That false-positive area caused label candidates
      near a diagonally-coordinated atom (e.g. square planar with bonds at
      45 degrees) to all look "blocked", even directions that never
      actually cross the bond. The optimizer then picked whatever scored
      least-bad, which still visibly crossed a bond.

      The functions below test the actual line segment against a label box,
      so only directions that truly cross (or pass very close to) the
      rendered bond are penalized.
    */
    function bondSegment(bond) {
      var a = atomByKey[bond.atom1Key];
      var b = atomByKey[bond.atom2Key];

      if (!a || !b) {
        return null;
      }

      return {
        p1: screenPoint(a.cart),
        p2: screenPoint(b.cart),
        halfWidth: Math.max(4, bondHaloWidth * 0.55)
      };
    }

    function pointInBBox(p, box) {
      return p.x >= box.minX && p.x <= box.maxX &&
        p.y >= box.minY && p.y <= box.maxY;
    }

    function segmentsIntersect(p1, p2, p3, p4) {
      function cross(ax, ay, bx, by) {
        return ax * by - ay * bx;
      }

      var d1x = p2.x - p1.x, d1y = p2.y - p1.y;
      var d2x = p4.x - p3.x, d2y = p4.y - p3.y;

      var denom = cross(d1x, d1y, d2x, d2y);

      if (denom === 0) {
        return false;
      }

      var t = cross(p3.x - p1.x, p3.y - p1.y, d2x, d2y) / denom;
      var u = cross(p3.x - p1.x, p3.y - p1.y, d1x, d1y) / denom;

      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    }

    function pointToSegmentDistance(p, a, b) {
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var lenSq = dx * dx + dy * dy;

      var t = lenSq > 0
        ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
        : 0;

      t = Math.max(0, Math.min(1, t));

      var px = a.x + t * dx;
      var py = a.y + t * dy;

      var ex = p.x - px;
      var ey = p.y - py;

      return Math.sqrt(ex * ex + ey * ey);
    }

    /*
      Returns the minimum distance between a (thin, centerline) bond
      segment and a label bbox. Returns 0 if the segment actually crosses
      into the box.
    */
    function segmentToBBoxDistance(p1, p2, box) {
      if (pointInBBox(p1, box) || pointInBBox(p2, box)) {
        return 0;
      }

      var corners = [
        { x: box.minX, y: box.minY },
        { x: box.maxX, y: box.minY },
        { x: box.maxX, y: box.maxY },
        { x: box.minX, y: box.maxY }
      ];

      var i;

      for (i = 0; i < 4; i++) {
        var c1 = corners[i];
        var c2 = corners[(i + 1) % 4];

        if (segmentsIntersect(p1, p2, c1, c2)) {
          return 0;
        }
      }

      var best = Infinity;

      for (i = 0; i < 4; i++) {
        best = Math.min(best, pointToSegmentDistance(corners[i], p1, p2));
      }

      best = Math.min(best, pointToSegmentDistance(p1, corners[0], corners[2]));
      best = Math.min(best, pointToSegmentDistance(p2, corners[0], corners[2]));

      return best;
    }

    function makeLabelCandidates(atom, atomBox, text, fontSize) {
      var c = screenPoint(atom.cart);
      var w = estimateTextWidth(text, fontSize);
      var h = fontSize;
      var gap = labelGap;

      var left = atomBox.minX - gap - w;
      var right = atomBox.maxX + gap;
      var top = atomBox.minY - gap;
      var bottom = atomBox.maxY + gap + h;

      var cx = c.x - w / 2;
      var cy = c.y + h * 0.35;

      /*
        These offsets used to be fixed pixel values (4, 6, 9, 12). That
        works fine at the default font size, but as the font-size slider
        grows, the label box grows with it while these nudges stayed tiny -
        so at large font sizes, neighboring compass directions (e.g. NE vs
        ENE vs E) barely differed and all ended up overlapping the same
        bond, with no genuinely clear fallback direction left to pick.
        Scaling them with h (== fontSize) keeps the directional spread
        proportional to the label size at any zoom level.
      */
      var nudge = h * 0.3;
      var farNudge = h * 0.65;
      var fartherNudge = h * 0.9;
      var farVNudge = h * 0.45;

      /*
        Candidate order encodes aesthetic preference.
        NE and E are preferred, but collision score can override.
      */
      return [
        {
          name: "NE",
          x: right,
          y: top,
          preference: 0
        },
        {
          name: "ENE",
          x: right + nudge,
          y: cy - h * 0.45,
          preference: 1
        },
        {
          name: "E",
          x: right,
          y: cy,
          preference: 2
        },
        {
          name: "ESE",
          x: right + nudge,
          y: cy + h * 0.45,
          preference: 3
        },
        {
          name: "SE",
          x: right,
          y: bottom,
          preference: 4
        },
        {
          name: "NNE",
          x: cx + w * 0.25,
          y: top - nudge,
          preference: 5
        },
        {
          name: "N",
          x: cx,
          y: top,
          preference: 6
        },
        {
          name: "NNW",
          x: cx - w * 0.25,
          y: top - nudge,
          preference: 7
        },
        {
          name: "SSE",
          x: cx + w * 0.25,
          y: bottom + nudge,
          preference: 8
        },
        {
          name: "S",
          x: cx,
          y: bottom,
          preference: 9
        },
        {
          name: "SSW",
          x: cx - w * 0.25,
          y: bottom + nudge,
          preference: 10
        },
        {
          name: "NW",
          x: left,
          y: top,
          preference: 11
        },
        {
          name: "WNW",
          x: left - nudge,
          y: cy - h * 0.45,
          preference: 12
        },
        {
          name: "W",
          x: left,
          y: cy,
          preference: 13
        },
        {
          name: "WSW",
          x: left - nudge,
          y: cy + h * 0.45,
          preference: 14
        },
        {
          name: "SW",
          x: left,
          y: bottom,
          preference: 15
        },
      
        /*
          Wider fallback ring.
        */
        {
          name: "farNE",
          x: right + farNudge,
          y: top - farVNudge,
          preference: 16
        },
        {
          name: "farENE",
          x: right + fartherNudge,
          y: cy - h * 0.45,
          preference: 17
        },
        {
          name: "farE",
          x: right + fartherNudge,
          y: cy,
          preference: 18
        },
        {
          name: "farESE",
          x: right + fartherNudge,
          y: cy + h * 0.45,
          preference: 19
        },
        {
          name: "farSE",
          x: right + farNudge,
          y: bottom + farVNudge,
          preference: 20
        },
        {
          name: "farNW",
          x: left - farNudge,
          y: top - farVNudge,
          preference: 21
        },
        {
          name: "farWNW",
          x: left - fartherNudge,
          y: cy - h * 0.45,
          preference: 22
        },
        {
          name: "farW",
          x: left - fartherNudge,
          y: cy,
          preference: 23
        },
        {
          name: "farWSW",
          x: left - fartherNudge,
          y: cy + h * 0.45,
          preference: 24
        },
        {
          name: "farSW",
          x: left - farNudge,
          y: bottom + farVNudge,
          preference: 25
        }
      ];
    }

    function makeOptimizedLabelLayout() {
      var layout = {};
      var placed = [];

      if (!showLabels) {
        return layout;
      }

      /*
        Build static obstacles:
        atoms and bonds. Labels are added greedily afterwards.
      */
      var atomObstacles = atoms.map(function (atom) {
        return {
          type: "atom",
          key: atom.key,
          bbox: atomVisualBBox(atom)
        };
      });

      var bondObstacles = [];

      visibleBonds.forEach(function (bond) {
        var seg = bondSegment(bond);

        if (seg) {
          bondObstacles.push({
            type: "bond",
            p1: seg.p1,
            p2: seg.p2,
            halfWidth: seg.halfWidth
          });
        }
      });


      /*
        Put labels for front atoms first. That usually gives the visually
        important labels the best positions.
        Current convention: smaller z = closer.
      */
      var labelAtoms = atoms.filter(function (atom) {
        return atomLabelVisible(atom);
      }).sort(function (a, b) {
        return screenPoint(a.cart).z - screenPoint(b.cart).z;
      });

      labelAtoms.forEach(function (atom) {
        var text = atom.displayLabel || atom.label;
        var style = styleForElement(atom.element);
        var atomBox = atomVisualBBox(atom);
        var candidates = makeLabelCandidates(atom, atomBox, text, labelFontSize);

        var best = null;

        candidates.forEach(function (cand) {
          var box = labelBBox(
            cand.x,
            cand.y,
            text,
            labelFontSize,
            labelPadding
          );

          var score = 0;

          /*
            Aesthetic preference.
          */
          score += cand.preference * 5;

          /*
            Stay inside SVG.
          */
          score += bboxOutOfCanvasPenalty(box);

          /*
            Avoid atoms strongly.
          */
          atomObstacles.forEach(function (obs) {
            var area = bboxOverlapArea(box, obs.bbox);

            if (area > 0) {
              /*
                Own atom overlap is especially ugly.
              */
              score += area * (obs.key === atom.key ? 100 : 45);
            }
          });

          /*
            Avoid already placed labels very strongly.
          */
          placed.forEach(function (pl) {
            var area = bboxOverlapArea(box, pl.bbox);

            if (area > 0) {
              score += area * 130;
            }
          });

          /*
            Avoid bonds, but less strictly than atom/label overlaps.

            Uses the actual bond centerline (segment), not its axis-aligned
            bbox: for diagonal bonds that bbox is much larger than the
            rendered stroke and falsely "blocks" directions that never
            really cross the bond (this was the square-planar / NE-SE-SW-NW
            labelling bug).
          */
          bondObstacles.forEach(function (obs) {
            var dist = segmentToBBoxDistance(obs.p1, obs.p2, box);
            var clearance = obs.halfWidth + 2;

            if (dist < clearance) {
              /*
                Crossing (dist === 0) is penalized hardest; near-misses
                taper off smoothly so the optimizer still prefers "close but
                clear" over "far but still touching".
              */
              score += (clearance - dist) * 60 + (dist === 0 ? 400 : 0);
            }
          });

          /*
            Prefer labels not too far from their atom.
          */
          var c = screenPoint(atom.cart);
          var bx = (box.minX + box.maxX) / 2;
          var by = (box.minY + box.maxY) / 2;
          var dx = bx - c.x;
          var dy = by - c.y;

          score += Math.sqrt(dx * dx + dy * dy) * 0.05;

          if (!best || score < best.score) {
            best = {
              score: score,
              x: cand.x,
              y: cand.y,
              bbox: box,
              style: style,
              candidate: cand.name
            };
          }
        });

        if (!best) {
          var c = screenPoint(atom.cart);

          best = {
            score: 0,
            x: c.x + 5,
            y: c.y - 5,
            bbox: labelBBox(c.x + 5, c.y - 5, text, labelFontSize, labelPadding),
            style: style,
            candidate: "fallback"
          };
        }

        layout[atom.key] = best;
        placed.push(best);
      });

      return layout;
    }

    function labelSvg(atom, placement) {
      if (!placement) {
        return "";
      }

      var style = placement.style || styleForElement(atom.element);
      var c = screenPoint(atom.cart);

      var leader = "";

      if (labelLeaderLines) {
        var bx = Math.max(
          placement.bbox.minX,
          Math.min(c.x, placement.bbox.maxX)
        );

        var by = Math.max(
          placement.bbox.minY,
          Math.min(c.y, placement.bbox.maxY)
        );

        leader =
          "<line x1=\"" + c.x.toFixed(2) +
          "\" y1=\"" + c.y.toFixed(2) +
          "\" x2=\"" + bx.toFixed(2) +
          "\" y2=\"" + by.toFixed(2) +
          "\" stroke=\"#999\" stroke-width=\"0.8\" stroke-linecap=\"round\"/>";
      }

      /*
        paint-order gives the text a white halo.
        This keeps labels readable even near bonds/ellipsoids.
      */
      return leader +
        "<text x=\"" + placement.x.toFixed(2) +
        "\" y=\"" + placement.y.toFixed(2) +
        "\" font-family=\"Arial, sans-serif\" font-size=\"" + labelFontSize +
        "\" fill=\"" + (style.labelColor || "#111111") +
        "\" stroke=\"#ffffff\" stroke-width=\"" + labelHaloWidth +
        "\" paint-order=\"stroke fill\" stroke-linejoin=\"round\">" +
       atomLabelSvg(atom) +
       "</text>";
    }

    var labelLayout = optimizeLabels
      ? makeOptimizedLabelLayout()
      : {};

    var drawItems = [];
    var hitItems = [];

    /*
      Layer convention:
      10 = molecular geometry, depth-sorted
      30 = labels, always drawn last

      Within one layer:
      larger z is farther back,
      smaller z is closer to viewer.

      Therefore we sort b.z - a.z:
      far objects first, near objects later.
    */

    /*
      Bonds with white halo.

      This is the "outlined bond" / "haloed bond" effect:
      - draw a thick white line
      - draw a thinner black line on top
      - because near bonds are drawn later, their white halo cuts through
        bonds and ellipsoid lines behind them.
    */

    function bondCoreColorForAtom(atom) {
      if (!atom) {
        return bondColor;
      }

      /*
        User preference:
        C and H are black in two-colored bonds.
      */
      if (atom.element === "C" || atom.element === "H") {
        return bondColor;
      }

      var style = styleForElement(atom.element);

      return style.stroke || bondColor;
    }

    visibleBonds.forEach(function (bond) {
      var a = atomByKey[bond.atom1Key];
      var b = atomByKey[bond.atom2Key];

      if (!a || !b) {
        return;
      }

      var override = bondOverrideFor(bond);
      var bondDashed = override.style === "dashed";
      var bondDashArray = bondDashed
        ? (bondWidth * 3.5).toFixed(2) + " " + (bondWidth * 3.0).toFixed(2)
        : "";
      var bondLineCap = bondDashed ? "butt" : "round";

      var paCenter = screenPoint(a.cart);
      var pbCenter = screenPoint(b.cart);

      /*
        Bond clipping is now separated for the different visual layers.

        Core:
          may run up to / slightly under the filled ellipsoid.

        Halo:
          stops earlier, so it remains mainly to the left/right of the bond
          and does not form a white cap inside the ellipsoid.

        Shadow:
          follows the core endpoint logic, but is still suppressed for dashed
          bonds and when bond shadows are disabled.
      */
      var coreGap = bondAtomGap;
      var haloGap = bondHaloWidth > 0
        ? Math.max(0, bondHaloWidth * 0.15)
        : coreGap;
      var shadowGap = coreGap;

      if (zeroBondGap) {
        coreGap = 0;
        haloGap = 0;
        shadowGap = 0;
      }

      var paCore = clipBondEndpointToAtomWithGap(a, paCenter, pbCenter, coreGap);
      var pbCore = clipBondEndpointToAtomWithGap(b, pbCenter, paCenter, coreGap);

      var paHalo = bondHaloWidth > 0
        ? clipBondEndpointToAtomWithGap(a, paCenter, pbCenter, haloGap)
        : paCore;
      var pbHalo = bondHaloWidth > 0
        ? clipBondEndpointToAtomWithGap(b, pbCenter, paCenter, haloGap)
        : pbCore;

      var paShadow = clipBondEndpointToAtomWithGap(a, paCenter, pbCenter, shadowGap);
      var pbShadow = clipBondEndpointToAtomWithGap(b, pbCenter, paCenter, shadowGap);

      var clippedDx = pbCore.x - paCore.x;
      var clippedDy = pbCore.y - paCore.y;

      /*
        If two atoms overlap heavily, avoid drawing tiny artefact bonds.
      */
      if (Math.sqrt(clippedDx * clippedDx + clippedDy * clippedDy) < 1.0) {
        return;
      }

      var x1 = paCore.x.toFixed(2);
      var y1 = paCore.y.toFixed(2);
      var x2 = pbCore.x.toFixed(2);
      var y2 = pbCore.y.toFixed(2);

      hitItems.push(
        makeBondHitSvg(bond, x1, y1, x2, y2)
      );

      var coreBondSvg = "";

      if (twoColoredBonds) {
        var midX = ((paCore.x + pbCore.x) / 2).toFixed(2);
        var midY = ((paCore.y + pbCore.y) / 2).toFixed(2);

        var colorA = bondCoreColorForAtom(a);
        var colorB = bondCoreColorForAtom(b);

        /*
          Use butt caps for the two colored halves so the join in the middle
          stays clean and does not form a round blob.
        */
        coreBondSvg =
          makeLineSvg(
            x1,
            y1,
            midX,
            midY,
            colorA,
            bondWidth,
            "butt",
            bondDashArray
          ) +

          makeLineSvg(
            midX,
            midY,
            x2,
            y2,
            colorB,
            bondWidth,
            "butt",
            bondDashArray
          );
      } else {
        coreBondSvg =
          makeLineSvg(
            x1,
            y1,
            x2,
            y2,
            bondColor,
            bondWidth,
            bondLineCap,
            bondDashArray
          );
      }

      var haloBondSvg = "";

      if (bondHaloWidth > 0) {
        var haloDx = pbHalo.x - paHalo.x;
        var haloDy = pbHalo.y - paHalo.y;

        if (Math.sqrt(haloDx * haloDx + haloDy * haloDy) >= 1.0) {
          haloBondSvg =
            makeLineSvg(
              paHalo.x.toFixed(2),
              paHalo.y.toFixed(2),
              pbHalo.x.toFixed(2),
              pbHalo.y.toFixed(2),
              bondHaloColor,
              bondHaloWidth,
              "butt",
              bondDashArray
            );
        }
      }

      /*
        Bond drawing order:
        1. white halo, wide, clipped shorter than the core bond
        2. grey slightly offset shadow for solid bonds only
        3. black/two-colored core bond

        Dashed bonds intentionally skip the grey shadow because the offset
        shadow can fall into the dash gaps and make the bond look irregular.
      */
      var bondShadowSvg = (!bondShadows || bondDashed)
        ? ""
        : makeLineSvg(
            (paShadow.x + bondShadowDx).toFixed(2),
            (paShadow.y + bondShadowDy).toFixed(2),
            (pbShadow.x + bondShadowDx).toFixed(2),
            (pbShadow.y + bondShadowDy).toFixed(2),
            bondShadowColor,
            bondShadowWidth,
            bondLineCap,
            ""
          );

      drawItems.push({
        layer: 10,
        z: (paCenter.z + pbCenter.z) / 2,
        svg:
          haloBondSvg +

          bondShadowSvg +

          coreBondSvg
      });
    });

    /*
      Atoms / ellipsoids.
    */
    atoms.forEach(function (atom) {
      var style = styleForElement(atom.element);
      var color = style.stroke;
      var axes = getAxesForAtom(atom);
      var centerProjected = screenPoint(atom.cart);
      
      hitItems.push(
        makeAtomHitSvg(atom, centerProjected)
      );      

      if (axes) {
        var rings = [
          [axes[0], axes[1]],
          [axes[0], axes[2]],
          [axes[1], axes[2]]
        ].map(function (pair) {
          return makeRingPoints(atom.cart, pair[0], pair[1], 64);
        });

        /*
          Filled ORTEP ellipsoid.

          Drawing order inside the atom item:
          1. opaque filled projected ellipsoid silhouette
          2. ellipsoid ring lines on top

          Because the whole item is depth-sorted, nearer filled ellipsoids
          hide bonds and ellipsoids behind them.
        */
        var ringSvg = "";

        if (style.showRings !== false) {
          ringSvg = rings.map(function (ring) {
            return ringPolylineSvg(
              ring,
              color,
              atom.element === "H"
                ? hydrogenEllipsoidLineWidth
                : (style.ellipsoidWidth
                    ? style.ellipsoidWidth * finalOrtepLineScale
                    : ellipsoidLineWidth),
              centerProjected.z,
              showBackfaces
            );
          }).join("");
        }

        drawItems.push({
          layer: 10,
          z: centerProjected.z,
          svg:
            filledEllipsoidSvg(atom, axes, style) +
            ringSvg
        });
      } else {
        var r = (style.fallbackRadius || 0.14) * scale;

        drawItems.push({
          layer: 10,
          z: centerProjected.z,
          svg:
            "<circle cx=\"" + centerProjected.x.toFixed(2) +
            "\" cy=\"" + centerProjected.y.toFixed(2) +
            "\" r=\"" + r.toFixed(2) +
            "\" fill=\"#ffffff\" stroke=\"" + color +
            "\" stroke-width=\"" + (
              style.fallbackStrokeWidth
                ? style.fallbackStrokeWidth * finalOrtepLineScale
                : atomFallbackLineWidth
            ) +
            "\"/>"
        });
      }

      /*
        Labels always above geometry.
        Position is optimized once in labelLayout.
      */
      if (showLabels && atomLabelVisible(atom)) {
        var placement = optimizeLabels
          ? labelLayout[atom.key]
          : {
              x: centerProjected.x + 5,
              y: centerProjected.y - 5,
              bbox: labelBBox(
                centerProjected.x + 5,
                centerProjected.y - 5,
                atom.displayLabel || atom.label,
                labelFontSize,
                labelPadding
              ),
              style: style
            };

        drawItems.push({
          layer: 30,
          z: centerProjected.z,
          svg: labelSvg(atom, placement)
        });
      }
    });

    /*
      Correct depth sorting for this codebase.

      Earlier version was:
        return a.z - b.z;

      That was reversed for your rendered view.

      Now:
      - larger z = farther away = drawn first
      - smaller z = closer = drawn later
      - foreground halos cut through background bonds
    */
    drawItems.sort(function (a, b) {
      var la = a.layer || 10;
      var lb = b.layer || 10;

      if (la !== lb) {
        return la - lb;
      }

      return b.z - a.z;
    });

    var svg =
      "<svg xmlns=\"http://www.w3.org/2000/svg\" " +
      "width=\"" + width + "\" height=\"" + height + "\" " +
      "viewBox=\"0 0 " + width + " " + height + "\" " +
      "data-fit-scale=\"" + fitScale.toFixed(4) + "\" " +
      "data-projection-scale=\"" + scale.toFixed(4) + "\">" +
        "<rect x=\"0\" y=\"0\" width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>" +
        "<g>" +
          drawItems.map(function (item) {
            return item.svg;
          }).join("") +
        "</g>" +
        "<g class=\"ortep-hit-layer\">" +
          hitItems.join("") +
        "</g>" +
      "</svg>";

    return svg;
  }
  function makeSvgPublic(fragment, options) {
    options = options || {};
    fragment._model = fragment._model || options.model;

    return makeSvg(fragment, options);
  }

  function makeFragmentForCenterPublic(model, centerLabel, options) {
    var fragment = makeFragmentForCenter(model, centerLabel, options);
    fragment._model = model;
    return fragment;
  }

  function makeBondedComponentForAtomPublic(model, startLabel, options) {
    var fragment = makeBondedComponentForAtom(model, startLabel, options);
    fragment._model = model;
    return fragment;
  }

CIFLord.OrtepSvg = {
  parseCif: parseCif,

  makeFragmentForCenter: makeFragmentForCenterPublic,
  makeBondedComponentForAtom: makeBondedComponentForAtomPublic,

  makeViewState: makeViewState,
  rotateView: rotateView,

  makeSvg: makeSvgPublic,

  _internal: {
    eigenSym3: eigenSym3,
    ellipsoidAxes: ellipsoidAxes,
    transformAdpToCartesian: transformAdpToCartesian,
    affineFromSymCode: affineFromSymCode,
    composeAffine: composeAffine,
    inverseAffine: inverseAffine
  }
};
})();
