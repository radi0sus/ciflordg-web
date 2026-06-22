// cshm.js
// Continuous Shape Measures after the Python reference implementation.
// Non-module version for direct file:// usage via open index.html.
//
// Matches the Python logic:
//   coordinates = [central atom at 0,0,0] + ligand relative coordinates
//   input_structure = normalize_structure(coordinates)
//   all permutations are considered
//   H = input_structure.T @ permuted_ideal
//   U, S, Vt = svd(H)
//   R = Vt.T @ U.T
//   rotated_ideal = permuted_ideal @ R
//   scale = sum(input_structure * rotated_ideal) / sum(ideal_shape**2)
//   cshm = mean(sum((input_structure - scale * rotated_ideal)^2)) * 100
//
// Ideal structures from cosymlib-style coordinates, as in the Python script.
// Each ideal structure contains CN ligand vertices + central atom.

// ── Ideal structures ─────────────────────────────────────────────────────────

const IDEAL_SHAPES = {
  // CN 2
  'L-2': {
    name: 'Linear',
    cn: 2,
    coords: [
      [ 1.224744871392, 0.0, 0.0],
      [-1.224744871392, 0.0, 0.0],
      [ 0.0,            0.0, 0.0],
    ],
  },

  'vT-2': {
    name: 'Divacant tetrahedron / V-shape',
    cn: 2,
    coords: [
      [ 0.801783725737,  0.801783725737,  0.267261241912],
      [-0.801783725737, -0.801783725737,  0.267261241912],
      [ 0.0,             0.0,            -0.534522483825],
    ],
  },

  'vOC-2': {
    name: 'Tetravacant octahedron / L-shape',
    cn: 2,
    coords: [
      [ 1.0, -0.5, 0.0],
      [-0.5,  1.0, 0.0],
      [-0.5, -0.5, 0.0],
    ],
  },

  // CN 3
  'TP-3': {
    name: 'Trigonal planar',
    cn: 3,
    coords: [
      [ 1.154700538379,  0.0, 0.0],
      [-0.577350269190,  1.0, 0.0],
      [-0.577350269190, -1.0, 0.0],
      [ 0.0,             0.0, 0.0],
    ],
  },

  'vT-3': {
    name: 'Vacant tetrahedron / trigonal pyramid',
    cn: 3,
    coords: [
      [ 1.137070487230,  0.0,             0.100503781526],
      [-0.568535243615,  0.984731927835,  0.100503781526],
      [-0.568535243615, -0.984731927835,  0.100503781526],
      [ 0.0,             0.0,            -0.301511344578],
    ],
  },

  'fvOC-3': {
    name: 'fac-trivacant octahedron',
    cn: 3,
    coords: [
      [ 1.0,            -0.333333333333, -0.333333333333],
      [-0.333333333333,  1.0,            -0.333333333333],
      [-0.333333333333, -0.333333333333,  1.0],
      [-0.333333333333, -0.333333333333, -0.333333333333],
    ],
  },

  'mvOC-3': {
    name: 'mer-trivacant octahedron / T-shape',
    cn: 3,
    coords: [
      [ 1.206045378311, -0.301511344578, 0.0],
      [ 0.0,             0.904534033733, 0.0],
      [-1.206045378311, -0.301511344578, 0.0],
      [ 0.0,            -0.301511344578, 0.0],
    ],
  },

  // CN 4
  'SP-4': {
    name: 'Square planar',
    cn: 4,
    coords: [
      [ 1.118033988750,  0.0,            0.0],
      [ 0.0,             1.118033988750, 0.0],
      [-1.118033988750,  0.0,            0.0],
      [ 0.0,            -1.118033988750, 0.0],
      [ 0.0,             0.0,            0.0],
    ],
  },

  'T-4': {
    name: 'Tetrahedron',
    cn: 4,
    coords: [
      [ 0.0,             0.912870929175, -0.645497224368],
      [ 0.0,            -0.912870929175, -0.645497224368],
      [ 0.912870929175,  0.0,             0.645497224368],
      [-0.912870929175,  0.0,             0.645497224368],
      [ 0.0,             0.0,             0.0],
    ],
  },

  'SS-4': {
    name: 'Seesaw',
    cn: 4,
    coords: [
      [-0.235702260396, -0.235702260396, -1.178511301978],
      [ 0.942809041582, -0.235702260396,  0.0],
      [-0.235702260396,  0.942809041582,  0.0],
      [-0.235702260396, -0.235702260396,  1.178511301978],
      [-0.235702260396, -0.235702260396,  0.0],
    ],
  },

  'vTBPY-4': {
    name: 'Axially vacant trigonal bipyramid',
    cn: 4,
    coords: [
      [ 0.0,             0.0,            -0.917662935482],
      [ 1.147078669353,  0.0,             0.229415733871],
      [-0.573539334676,  0.993399267799,  0.229415733871],
      [-0.573539334676, -0.993399267799,  0.229415733871],
      [ 0.0,             0.0,             0.229415733871],
    ],
  },

  // CN 5
  'PP-5': {
    name: 'Pentagon',
    cn: 5,
    coords: [
      [ 1.095445115010,  0.0,            0.0],
      [ 0.338511156943,  1.041830214874, 0.0],
      [-0.886233714448,  0.643886483299, 0.0],
      [-0.886233714448, -0.643886483299, 0.0],
      [ 0.338511156943, -1.041830214874, 0.0],
      [ 0.0,             0.0,            0.0],
    ],
  },

  'vOC-5': {
    name: 'Vacant octahedron / Johnson square pyramid',
    cn: 5,
    coords: [
      [ 0.0,             0.0,            -0.928476690885],
      [ 1.114172029062,  0.0,             0.185695338177],
      [ 0.0,             1.114172029062,  0.185695338177],
      [-1.114172029062,  0.0,             0.185695338177],
      [ 0.0,            -1.114172029062,  0.185695338177],
      [ 0.0,             0.0,             0.185695338177],
    ],
  },

  'TBPY-5': {
    name: 'Trigonal bipyramidal',
    cn: 5,
    coords: [
      [ 0.0,             0.0,            -1.095445115010],
      [ 1.095445115010,  0.0,             0.0],
      [-0.547722557505,  0.948683298051,  0.0],
      [-0.547722557505, -0.948683298051,  0.0],
      [ 0.0,             0.0,             1.095445115010],
      [ 0.0,             0.0,             0.0],
    ],
  },

  'SPY-5': {
    name: 'Square pyramidal',
    cn: 5,
    coords: [
      [ 0.0,             0.0,             1.095445115010],
      [ 1.060660171780,  0.0,            -0.273861278753],
      [ 0.0,             1.060660171780, -0.273861278753],
      [-1.060660171780,  0.0,            -0.273861278753],
      [ 0.0,            -1.060660171780, -0.273861278753],
      [ 0.0,             0.0,             0.0],
    ],
  },

  'JTBPY-5': {
    name: 'Johnson trigonal bipyramid',
    cn: 5,
    coords: [
      [ 0.925820099773,  0.0,             0.0],
      [-0.462910049886,  0.801783725737,  0.0],
      [-0.462910049886, -0.801783725737,  0.0],
      [ 0.0,             0.0,             1.309307341416],
      [ 0.0,             0.0,            -1.309307341416],
      [ 0.0,             0.0,             0.0],
    ],
  },

  // CN 6
  'HP-6': {
    name: 'Hexagon',
    cn: 6,
    coords: [
      [ 1.080123449735,  0.0,            0.0],
      [ 0.540061724867,  0.935414346693, 0.0],
      [-0.540061724867,  0.935414346693, 0.0],
      [-1.080123449735,  0.0,            0.0],
      [-0.540061724867, -0.935414346693, 0.0],
      [ 0.540061724867, -0.935414346693, 0.0],
      [ 0.0,             0.0,            0.0],
    ],
  },

  'PPY-6': {
    name: 'Pentagonal pyramid',
    cn: 6,
    coords: [
      [ 0.0,             0.0,            -0.937042571332],
      [ 1.093216333220,  0.0,             0.156173761889],
      [ 0.337822425493,  1.039710517429,  0.156173761889],
      [-0.884430592103,  0.642576438232,  0.156173761889],
      [-0.884430592103, -0.642576438232,  0.156173761889],
      [ 0.337822425493, -1.039710517429,  0.156173761889],
      [ 0.0,             0.0,             0.156173761889],
    ],
  },

  'OC-6': {
    name: 'Octahedron',
    cn: 6,
    coords: [
      [ 0.0,             0.0,            -1.080123449735],
      [ 1.080123449735,  0.0,             0.0],
      [ 0.0,             1.080123449735,  0.0],
      [-1.080123449735,  0.0,             0.0],
      [ 0.0,            -1.080123449735,  0.0],
      [ 0.0,             0.0,             1.080123449735],
      [ 0.0,             0.0,             0.0],
    ],
  },

  'TPR-6': {
    name: 'Trigonal prism',
    cn: 6,
    coords: [
      [ 0.816496580928,  0.0,            -0.707106781187],
      [-0.408248290464,  0.707106781187, -0.707106781187],
      [-0.408248290464, -0.707106781187, -0.707106781187],
      [ 0.816496580928,  0.0,             0.707106781187],
      [-0.408248290464,  0.707106781187,  0.707106781187],
      [-0.408248290464, -0.707106781187,  0.707106781187],
      [ 0.0,             0.0,             0.0],
    ],
  },

  'JPPY-6': {
    name: 'Johnson pentagonal pyramid',
    cn: 6,
    coords: [
      [ 1.146281780821,  0.0,             0.101205871605],
      [ 0.354220550616,  1.090178757161,  0.101205871605],
      [-0.927361441027,  0.673767525738,  0.101205871605],
      [-0.927361441027, -0.673767525738,  0.101205871605],
      [ 0.354220550616, -1.090178757161,  0.101205871605],
      [ 0.0,             0.0,            -0.607235229628],
      [ 0.0,             0.0,             0.101205871605],
    ],
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

function calcCShM(centralAtom, ligands) {
  const cn = ligands.length;
  const results = {};

  if (cn < 2 || cn > 6) return results;

  // Python-equivalent coordinate array:
  // central atom first at relative position 0,0,0; then all ligands.
  const coordinates = [
    [0.0, 0.0, 0.0],
    ...ligands.map(l => [
      Number(l.x) - Number(centralAtom.x),
      Number(l.y) - Number(centralAtom.y),
      Number(l.z) - Number(centralAtom.z),
    ]),
  ];

  for (const [label, shape] of Object.entries(IDEAL_SHAPES)) {
    if (shape.cn !== cn) continue;
    results[label] = calcCShMExact(coordinates, shape.coords);
  }

  return results;
}

// ── Python-equivalent CShM exact calculation ──────────────────────────────────

function calcCShMExact(coordinates, idealShape) {
  const inputStructure = normalizeStructure(coordinates);
  const idealSqNorms = sumSqAll(idealShape);

  let minCshm = Infinity;

  const n = coordinates.length;
  const base = Array.from({ length: n }, (_, i) => i);

  forEachPermutation(base, perm => {
    const permutedIdeal = perm.map(i => idealShape[i]);

    const H = matMul3(transposePoints(inputStructure), permutedIdeal);
    const svd = svd3(H);

    // Python:
    // R = Vt.T @ U.T
    const R = matMul3(transpose3(svd.Vt), transpose3(svd.U));

    // Python row-vector multiplication:
    // rotated_ideal = permuted_ideal @ R
    const rotatedIdeal = permutedIdeal.map(p => rowVecMul3(p, R));

    const scale = dotAll(inputStructure, rotatedIdeal) / idealSqNorms;

    let sum = 0.0;
    for (let i = 0; i < inputStructure.length; i++) {
      const dx = inputStructure[i][0] - scale * rotatedIdeal[i][0];
      const dy = inputStructure[i][1] - scale * rotatedIdeal[i][1];
      const dz = inputStructure[i][2] - scale * rotatedIdeal[i][2];
      sum += dx * dx + dy * dy + dz * dz;
    }

    const cshm = sum / inputStructure.length;
    if (cshm < minCshm) minCshm = cshm;
  });

  return minCshm * 100.0;
}

// ── Normalization ─────────────────────────────────────────────────────────────

function normalizeStructure(coords) {
  const n = coords.length;

  const mean = [0, 0, 0];
  for (const p of coords) {
    mean[0] += p[0];
    mean[1] += p[1];
    mean[2] += p[2];
  }
  mean[0] /= n;
  mean[1] /= n;
  mean[2] /= n;

  const centered = coords.map(p => [
    p[0] - mean[0],
    p[1] - mean[1],
    p[2] - mean[2],
  ]);

  let rms = 0.0;
  for (const p of centered) {
    rms += p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
  }
  rms = Math.sqrt(rms / n);

  if (rms < 1e-14) return centered;

  return centered.map(p => [
    p[0] / rms,
    p[1] / rms,
    p[2] / rms,
  ]);
}

// ── Permutations ──────────────────────────────────────────────────────────────

function forEachPermutation(arr, callback) {
  const a = arr.slice();
  const n = a.length;
  const c = new Array(n).fill(0);

  callback(a.slice());

  let i = 1;
  while (i < n) {
    if (c[i] < i) {
      if (i % 2 === 0) {
        swap(a, 0, i);
      } else {
        swap(a, c[i], i);
      }
      callback(a.slice());
      c[i]++;
      i = 1;
    } else {
      c[i] = 0;
      i++;
    }
  }
}

function swap(a, i, j) {
  const t = a[i];
  a[i] = a[j];
  a[j] = t;
}

// ── Linear algebra helpers ────────────────────────────────────────────────────

function sumSqAll(points) {
  let s = 0.0;
  for (const p of points) {
    s += p[0] * p[0] + p[1] * p[1] + p[2] * p[2];
  }
  return s;
}

function dotAll(A, B) {
  let s = 0.0;
  for (let i = 0; i < A.length; i++) {
    s += A[i][0] * B[i][0] + A[i][1] * B[i][1] + A[i][2] * B[i][2];
  }
  return s;
}

// For points N×3, returns 3×N.
function transposePoints(points) {
  const T = [[], [], []];
  for (const p of points) {
    T[0].push(p[0]);
    T[1].push(p[1]);
    T[2].push(p[2]);
  }
  return T;
}

// Generic matrix multiply.
function matMul3(A, B) {
  const rows = A.length;
  const inner = B.length;
  const cols = B[0].length;

  const C = Array.from({ length: rows }, () => new Array(cols).fill(0.0));

  for (let i = 0; i < rows; i++) {
    for (let k = 0; k < inner; k++) {
      const aik = A[i][k];
      for (let j = 0; j < cols; j++) {
        C[i][j] += aik * B[k][j];
      }
    }
  }

  return C;
}

function transpose3(A) {
  return [
    [A[0][0], A[1][0], A[2][0]],
    [A[0][1], A[1][1], A[2][1]],
    [A[0][2], A[1][2], A[2][2]],
  ];
}

function rowVecMul3(v, M) {
  return [
    v[0] * M[0][0] + v[1] * M[1][0] + v[2] * M[2][0],
    v[0] * M[0][1] + v[1] * M[1][1] + v[2] * M[2][1],
    v[0] * M[0][2] + v[1] * M[1][2] + v[2] * M[2][2],
  ];
}

function colVecMul3(M, v) {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ];
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function norm3(a) {
  return Math.sqrt(dot3(a, a));
}

function scale3(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}

function sub3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize3(a) {
  const n = norm3(a);
  if (n < 1e-14) return [0, 0, 0];
  return [a[0] / n, a[1] / n, a[2] / n];
}

// ── Robust 3×3 SVD via eigen-decomposition of AᵀA ────────────────────────────
// Returns A ≈ U * diag(S) * Vt.
// Good enough for the 3×3 CShM/Kabsch step, including planar cases.

function svd3(A) {
  const At = transpose3(A);
  const AtA = matMul3(At, A);

  let eig = eigenSym3(AtA);

  // Sort singular values descending.
  const order = [0, 1, 2].sort((i, j) => eig.vals[j] - eig.vals[i]);

  const S = order.map(i => Math.sqrt(Math.max(0, eig.vals[i])));

  // V columns are eigenvectors.
  let V = [
    [eig.vecs[0][order[0]], eig.vecs[0][order[1]], eig.vecs[0][order[2]]],
    [eig.vecs[1][order[0]], eig.vecs[1][order[1]], eig.vecs[1][order[2]]],
    [eig.vecs[2][order[0]], eig.vecs[2][order[1]], eig.vecs[2][order[2]]],
  ];

  // Orthonormalize V defensively.
  V = orthonormalizeColumns3(V);

  // U columns: u_i = A v_i / s_i for nonzero s_i.
  let Ucols = [];
  for (let j = 0; j < 3; j++) {
    const vj = [V[0][j], V[1][j], V[2][j]];
    if (S[j] > 1e-12) {
      Ucols[j] = scale3(colVecMul3(A, vj), 1.0 / S[j]);
    } else {
      Ucols[j] = [0, 0, 0];
    }
  }

  Ucols = completeOrthonormalBasis(Ucols);

  const U = [
    [Ucols[0][0], Ucols[1][0], Ucols[2][0]],
    [Ucols[0][1], Ucols[1][1], Ucols[2][1]],
    [Ucols[0][2], Ucols[1][2], Ucols[2][2]],
  ];

  return {
    U,
    S,
    Vt: transpose3(V),
  };
}

function eigenSym3(A) {
  let a = [
    [A[0][0], A[0][1], A[0][2]],
    [A[1][0], A[1][1], A[1][2]],
    [A[2][0], A[2][1], A[2][2]],
  ];

  let V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  for (let iter = 0; iter < 80; iter++) {
    let p = 0;
    let q = 1;
    let max = Math.abs(a[0][1]);

    const a02 = Math.abs(a[0][2]);
    if (a02 > max) {
      max = a02;
      p = 0;
      q = 2;
    }

    const a12 = Math.abs(a[1][2]);
    if (a12 > max) {
      max = a12;
      p = 1;
      q = 2;
    }

    if (max < 1e-14) break;

    const app = a[p][p];
    const aqq = a[q][q];
    const apq = a[p][q];

    const tau = (aqq - app) / (2.0 * apq);
    const t = Math.sign(tau || 1) / (Math.abs(tau) + Math.sqrt(1.0 + tau * tau));
    const c = 1.0 / Math.sqrt(1.0 + t * t);
    const s = t * c;

    for (let k = 0; k < 3; k++) {
      if (k !== p && k !== q) {
        const akp = a[k][p];
        const akq = a[k][q];

        a[k][p] = c * akp - s * akq;
        a[p][k] = a[k][p];

        a[k][q] = s * akp + c * akq;
        a[q][k] = a[k][q];
      }
    }

    const newApp = c * c * app - 2.0 * s * c * apq + s * s * aqq;
    const newAqq = s * s * app + 2.0 * s * c * apq + c * c * aqq;

    a[p][p] = newApp;
    a[q][q] = newAqq;
    a[p][q] = 0.0;
    a[q][p] = 0.0;

    // Update eigenvectors.
    for (let k = 0; k < 3; k++) {
      const vkp = V[k][p];
      const vkq = V[k][q];
      V[k][p] = c * vkp - s * vkq;
      V[k][q] = s * vkp + c * vkq;
    }
  }

  return {
    vals: [a[0][0], a[1][1], a[2][2]],
    vecs: V,
  };
}

function orthonormalizeColumns3(M) {
  let c0 = normalize3([M[0][0], M[1][0], M[2][0]]);

  let c1 = [M[0][1], M[1][1], M[2][1]];
  c1 = sub3(c1, scale3(c0, dot3(c1, c0)));
  c1 = normalize3(c1);

  if (norm3(c1) < 1e-12) {
    c1 = arbitraryPerpendicular(c0);
  }

  let c2 = cross3(c0, c1);
  c2 = normalize3(c2);

  return [
    [c0[0], c1[0], c2[0]],
    [c0[1], c1[1], c2[1]],
    [c0[2], c1[2], c2[2]],
  ];
}

function completeOrthonormalBasis(cols) {
  let valid = cols.map(c => norm3(c) > 1e-10);

  // Normalize valid columns.
  for (let i = 0; i < 3; i++) {
    if (valid[i]) cols[i] = normalize3(cols[i]);
  }

  // Gram-Schmidt among valid columns.
  if (valid[0] && valid[1]) {
    cols[1] = normalize3(sub3(cols[1], scale3(cols[0], dot3(cols[1], cols[0]))));
    valid[1] = norm3(cols[1]) > 1e-10;
  }

  if (valid[0] && !valid[1]) {
    cols[1] = arbitraryPerpendicular(cols[0]);
    valid[1] = true;
  }

  if (!valid[0] && valid[1]) {
    cols[0] = arbitraryPerpendicular(cols[1]);
    valid[0] = true;
  }

  if (!valid[0] && !valid[1] && valid[2]) {
    cols[0] = arbitraryPerpendicular(cols[2]);
    cols[1] = normalize3(cross3(cols[2], cols[0]));
    valid[0] = valid[1] = true;
  }

  if (!valid[0] && !valid[1] && !valid[2]) {
    cols[0] = [1, 0, 0];
    cols[1] = [0, 1, 0];
    cols[2] = [0, 0, 1];
    return cols;
  }

  if (!valid[2]) {
    cols[2] = normalize3(cross3(cols[0], cols[1]));
    if (norm3(cols[2]) < 1e-10) {
      cols[1] = arbitraryPerpendicular(cols[0]);
      cols[2] = normalize3(cross3(cols[0], cols[1]));
    }
  } else {
    // Orthogonalize c2 to c0 and c1.
    cols[2] = sub3(cols[2], scale3(cols[0], dot3(cols[2], cols[0])));
    cols[2] = sub3(cols[2], scale3(cols[1], dot3(cols[2], cols[1])));
    cols[2] = normalize3(cols[2]);

    if (norm3(cols[2]) < 1e-10) {
      cols[2] = normalize3(cross3(cols[0], cols[1]));
    }
  }

  return cols;
}

function arbitraryPerpendicular(v) {
  const av = v.map(Math.abs);

  let basis;
  if (av[0] <= av[1] && av[0] <= av[2]) {
    basis = [1, 0, 0];
  } else if (av[1] <= av[0] && av[1] <= av[2]) {
    basis = [0, 1, 0];
  } else {
    basis = [0, 0, 1];
  }

  let p = sub3(basis, scale3(v, dot3(basis, v)));
  p = normalize3(p);

  if (norm3(p) < 1e-12) return [1, 0, 0];
  return p;
}
