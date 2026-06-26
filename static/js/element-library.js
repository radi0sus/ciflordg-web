(function () {
  "use strict";

  window.CIFLord = window.CIFLord || {};

  /*
    Element definition library for CIFLord ORTEP.

    Plain JavaScript object instead of fetch()/JSON so the app continues
    to work from file:// URLs.

    Centralizes:
    - atomic numbers
    - element drawing styles
    - metal detection
    - H-parent distance heuristics
  */

  var atomicNumbers = {
    H: 1, He: 2,
    Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
    Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18,
    K: 19, Ca: 20, Sc: 21, Ti: 22, V: 23, Cr: 24, Mn: 25, Fe: 26,
    Co: 27, Ni: 28, Cu: 29, Zn: 30, Ga: 31, Ge: 32, As: 33, Se: 34,
    Br: 35, Kr: 36, Rb: 37, Sr: 38, Y: 39, Zr: 40, Nb: 41, Mo: 42,
    Tc: 43, Ru: 44, Rh: 45, Pd: 46, Ag: 47, Cd: 48, In: 49, Sn: 50,
    Sb: 51, Te: 52, I: 53, Xe: 54, Cs: 55, Ba: 56,
    La: 57, Ce: 58, Pr: 59, Nd: 60, Pm: 61, Sm: 62, Eu: 63,
    Gd: 64, Tb: 65, Dy: 66, Ho: 67, Er: 68, Tm: 69, Yb: 70, Lu: 71,
    Hf: 72, Ta: 73, W: 74, Re: 75, Os: 76, Ir: 77, Pt: 78,
    Au: 79, Hg: 80, Tl: 81, Pb: 82, Bi: 83, Po: 84, At: 85, Rn: 86,
    Fr: 87, Ra: 88, Ac: 89, Th: 90, Pa: 91, U: 92
  };

  var alkaliMetalElements = {
    Li: true,
    Na: true,
    K: true,
    Rb: true,
    Cs: true,
    Fr: true
  };

  var alkalineEarthMetalElements = {
    Be: true,
    Mg: true,
    Ca: true,
    Sr: true,
    Ba: true,
    Ra: true
  };

  var redMetalElements = {
    Sc: true,
    Ti: true,
    V: true,
    Cr: true,
    Mn: true,
    Fe: true,
    Co: true,
    Ni: true,
    Cu: true,
    Zn: true,

    Y: true,
    Zr: true,
    Nb: true,
    Mo: true,
    Tc: true,
    Ru: true,
    Rh: true,
    Pd: true,
    Ag: true,
    Cd: true,

    Hf: true,
    Ta: true,
    W: true,
    Re: true,
    Os: true,
    Ir: true,
    Pt: true,
    Au: true,
    Hg: true,

    Al: true,
    Ga: true,
    In: true,
    Sn: true,
    Tl: true,
    Pb: true,
    Bi: true,

    La: true,
    Ce: true,
    Pr: true,
    Nd: true,
    Pm: true,
    Sm: true,
    Eu: true,
    Gd: true,
    Tb: true,
    Dy: true,
    Ho: true,
    Er: true,
    Tm: true,
    Yb: true,
    Lu: true,

    Ac: true,
    Th: true,
    Pa: true,
    U: true
  };

  var defaultStyle = {
    stroke: "#333333",
    fill: "#f5f5f5",
    ellipsoidWidth: 1.45,
    fallbackRadius: 0.15,
    fallbackStrokeWidth: 1.35,
    labelColor: "#111111",
    showRings: true
  };

  var alkaliMetalStyle = {
    stroke: "#f97316",
    fill: "#ffedd5",
    ellipsoidWidth: 2.0,
    fallbackRadius: 0.20,
    fallbackStrokeWidth: 1.75,
    labelColor: "#c2410c",
    showRings: true
  };

  var alkalineEarthMetalStyle = {
    stroke: "#ea580c",
    fill: "#fed7aa",
    ellipsoidWidth: 2.0,
    fallbackRadius: 0.20,
    fallbackStrokeWidth: 1.75,
    labelColor: "#9a3412",
    showRings: true
  };

  var redMetalStyle = {
    stroke: "#b91c1c",
    fill: "#fee2e2",
    ellipsoidWidth: 2.1,
    fallbackRadius: 0.20,
    fallbackStrokeWidth: 1.8,
    labelColor: "#991b1b",
    showRings: true
  };

  var elementStyles = {
    H: {
      stroke: "#777777",
      fill: "#ffffff",
      ellipsoidWidth: 0.75,
      fallbackRadius: 0.075,
      fallbackStrokeWidth: 1.1,
      labelColor: "#555555",
      showRings: true
    },

    C: {
      stroke: "#111111",
      fill: "#ffffff",
      ellipsoidWidth: 1.75,
      fallbackRadius: 0.14,
      fallbackStrokeWidth: 1.75,
      labelColor: "#111111",
      showRings: false
    },

    B: {
      stroke: "#669999",
      fill: "#e0f2f2",
      ellipsoidWidth: 1.55,
      fallbackRadius: 0.145,
      fallbackStrokeWidth: 1.4,
      labelColor: "#4f7777",
      showRings: true
    },

    N: {
      stroke: "#1d4ed8",
      fill: "#dbeafe",
      ellipsoidWidth: 1.7,
      fallbackRadius: 0.145,
      fallbackStrokeWidth: 1.45,
      labelColor: "#1d4ed8",
      showRings: true
    },

    O: {
      stroke: "#0f766e",
      fill: "#ccfbf1",
      ellipsoidWidth: 1.7,
      fallbackRadius: 0.145,
      fallbackStrokeWidth: 1.45,
      labelColor: "#115e59",
      showRings: true
    },

    F: {
      stroke: "#22c55e",
      fill: "#ecfdf5",
      ellipsoidWidth: 1.65,
      fallbackRadius: 0.135,
      fallbackStrokeWidth: 1.4,
      labelColor: "#15803d",
      showRings: true
    },

    Si: {
      stroke: "#d97706",
      fill: "#fef3c7",
      ellipsoidWidth: 1.65,
      fallbackRadius: 0.17,
      fallbackStrokeWidth: 1.5,
      labelColor: "#b45309",
      showRings: true
    },

    Ge: {
      stroke: "#d97706",
      fill: "#fef3c7",
      ellipsoidWidth: 1.7,
      fallbackRadius: 0.175,
      fallbackStrokeWidth: 1.55,
      labelColor: "#b45309",
      showRings: true
    },

    P: {
      stroke: "#ea580c",
      fill: "#ffedd5",
      ellipsoidWidth: 1.7,
      fallbackRadius: 0.16,
      fallbackStrokeWidth: 1.5,
      labelColor: "#c2410c",
      showRings: true
    },

    S: {
      stroke: "#ca8a04",
      fill: "#fef3c7",
      ellipsoidWidth: 1.75,
      fallbackRadius: 0.165,
      fallbackStrokeWidth: 1.5,
      labelColor: "#a16207",
      showRings: true
    },

    Cl: {
      stroke: "#65a30d",
      fill: "#ecfccb",
      ellipsoidWidth: 1.75,
      fallbackRadius: 0.17,
      fallbackStrokeWidth: 1.55,
      labelColor: "#4d7c0f",
      showRings: true
    },

    Br: {
      stroke: "#92400e",
      fill: "#ffedd5",
      ellipsoidWidth: 1.85,
      fallbackRadius: 0.18,
      fallbackStrokeWidth: 1.6,
      labelColor: "#92400e",
      showRings: true
    },

    I: {
      stroke: "#7e22ce",
      fill: "#f3e8ff",
      ellipsoidWidth: 1.9,
      fallbackRadius: 0.19,
      fallbackStrokeWidth: 1.65,
      labelColor: "#7e22ce",
      showRings: true
    },

    Se: {
      stroke: "#b45309",
      fill: "#ffedd5",
      ellipsoidWidth: 1.8,
      fallbackRadius: 0.175,
      fallbackStrokeWidth: 1.55,
      labelColor: "#92400e",
      showRings: true
    },

    Te: {
      stroke: "#9333ea",
      fill: "#f3e8ff",
      ellipsoidWidth: 1.9,
      fallbackRadius: 0.19,
      fallbackStrokeWidth: 1.65,
      labelColor: "#7e22ce",
      showRings: true
    },

    As: {
      stroke: "#a855f7",
      fill: "#f3e8ff",
      ellipsoidWidth: 1.8,
      fallbackRadius: 0.18,
      fallbackStrokeWidth: 1.6,
      labelColor: "#7e22ce",
      showRings: true
    },

    Sb: {
      stroke: "#7c3aed",
      fill: "#ede9fe",
      ellipsoidWidth: 1.9,
      fallbackRadius: 0.19,
      fallbackStrokeWidth: 1.65,
      labelColor: "#6d28d9",
      showRings: true
    },

    At: {
      stroke: "#4c1d95",
      fill: "#ede9fe",
      ellipsoidWidth: 1.95,
      fallbackRadius: 0.20,
      fallbackStrokeWidth: 1.7,
      labelColor: "#4c1d95",
      showRings: true
    }
  };

  function normalizeElement(element) {
    element = String(element || "").replace(/[^A-Za-z]/g, "");

    if (!element) {
      return "";
    }

    if (element.length === 1) {
      return element.toUpperCase();
    }

    return element.charAt(0).toUpperCase() + element.charAt(1).toLowerCase();
  }

  function cloneObject(obj) {
    var out = {};

    Object.keys(obj || {}).forEach(function (key) {
      out[key] = obj[key];
    });

    return out;
  }

  function atomicNumber(element) {
    element = normalizeElement(element);
    return atomicNumbers[element] || 0;
  }

  function isAlkaliMetal(element) {
    element = normalizeElement(element);
    return !!alkaliMetalElements[element];
  }

  function isAlkalineEarthMetal(element) {
    element = normalizeElement(element);
    return !!alkalineEarthMetalElements[element];
  }

  function isRedMetal(element) {
    element = normalizeElement(element);
    return !!redMetalElements[element];
  }

  function isMetal(element) {
    element = normalizeElement(element);

    return (
      !!alkaliMetalElements[element] ||
      !!alkalineEarthMetalElements[element] ||
      !!redMetalElements[element]
    );
  }

  function styleForElement(element) {
    element = normalizeElement(element);

    /*
      Explicit element styles win.
      This is important for B, Si, Ge, As, Sb, etc.
    */
    if (elementStyles[element]) {
      return cloneObject(elementStyles[element]);
    }

    if (alkaliMetalElements[element]) {
      return cloneObject(alkaliMetalStyle);
    }

    if (alkalineEarthMetalElements[element]) {
      return cloneObject(alkalineEarthMetalStyle);
    }

    if (redMetalElements[element]) {
      return cloneObject(redMetalStyle);
    }

    return cloneObject(defaultStyle);
  }

  function colorForElement(element) {
    return styleForElement(element).stroke;
  }

  function hydrogenParentMaxDistance(parentElement) {
    /*
      Conservative generic limits for coordinate H attachment.
      This does not generate H atoms; it only assigns existing coordinate H
      atoms to plausible parent atoms.
    */

    parentElement = normalizeElement(parentElement);

    if (parentElement === "B") {
      return 1.35;
    }

    if (parentElement === "C") {
      return 1.25;
    }

    if (parentElement === "N") {
      return 1.20;
    }

    if (parentElement === "O") {
      return 1.15;
    }

    if (parentElement === "S" || parentElement === "P") {
      return 1.45;
    }

    if (parentElement === "Si" || parentElement === "Ge") {
      return 1.65;
    }

    return 1.25;
  }

  CIFLord.Elements = {
    atomicNumbers: atomicNumbers,

    elementStyles: elementStyles,
    defaultStyle: defaultStyle,

    alkaliMetalElements: alkaliMetalElements,
    alkalineEarthMetalElements: alkalineEarthMetalElements,
    redMetalElements: redMetalElements,

    alkaliMetalStyle: alkaliMetalStyle,
    alkalineEarthMetalStyle: alkalineEarthMetalStyle,
    redMetalStyle: redMetalStyle,

    normalizeElement: normalizeElement,
    atomicNumber: atomicNumber,

    isAlkaliMetal: isAlkaliMetal,
    isAlkalineEarthMetal: isAlkalineEarthMetal,
    isRedMetal: isRedMetal,
    isMetal: isMetal,

    styleForElement: styleForElement,
    colorForElement: colorForElement,
    hydrogenParentMaxDistance: hydrogenParentMaxDistance
  };
})();
