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

      ortep: {
        initialized: false,

        model: null,
        components: [],
        fragment: null,
        viewState: null,

        liveSvg: "",
        lastFitScale: null,

        sourceFilename: "",

        options: {
          componentId: "",
          probability: 50,

          bondWidth: 3.4,
          ortepLineScale: 1,
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
          zeroBondGap: false,

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
      },

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