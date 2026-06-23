(function () {
  "use strict";

  window.CIFLord = window.CIFLord || {};

  CIFLord.Data = {
    units: {
      angstrom: "Å",
      degree: "deg"
    },

    emptyState: {
      fileName: "",
      dataName: "",
      status: "No CIF loaded",
      hasLoadedCif: false,

      reportOptions: {
        showBonds: true,
        showAngles: true,
        showGeometry: true,
        showDisorder: true,
        showCaption: true,

        siUnits: true,
        addedDisplay: "separate",
        middleAtomOnly: true
      },

      selectionFilter: {
        element: "all",
        atom: "all"
      },

      averageFilter: {
        element: "all",
        atom: "all"
      },

      sortOptions: {
        bonds: "cif",
        angles: "cif",
        addedDistances: "cif"
      },

      selectionOptions: {
        independentOnly: false
      },

      averageOptions: {
        middleAtomOnly: false
      },

      geometryOptions: {
        centerElement: "",
        centerAtom: "",
        selectedLigandKeysByCenter: {}
      },

      geometryResults: [],

      disorderOptions: {
        excludeHydrogen: true,
        verbose: false
      },

      disorderRows: [],
      disorderEdits: {},

      items: {},
      cell: null,
      atoms: [],
      elements: [],
      symmetryOps: [],

      bonds: [],
      angles: [],
      addedDistances: [],
      interatomicSearchResults: [],
      symmetryNotes: [],

      lastSingleDistance: null,

      warnings: [
        "No CIF loaded."
      ]
    }
  };
})();