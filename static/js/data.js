(function () {
  "use strict";

  window.CIFLord = window.CIFLord || {};

  CIFLord.Data = {
    units: {
      angstrom: "A",
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
        showCaption: true,
        siUnits: true,
        addedDisplay: "separate",
        middleAtomOnly: false
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
        angles: "cif"
      },

      selectionOptions: {
        independentOnly: false
      },

      averageOptions: {
        middleAtomOnly: false
      },

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