(function () {
  "use strict";

  window.CIFLord = window.CIFLord || {};

  /*
    Moiety suggestion library for the Disorder Helper.

    This file intentionally uses a plain JavaScript object instead of fetch()
    or external JSON, so the app continues to work from file:// URLs.

    Visible labels use Unicode subscripts/superscripts, e.g. PF₆⁻.
    ASCII aliases are included for easier typing and matching.
  */

  CIFLord.MoietyLibrary = [
    {
      label: "solvent molecule",
      aliases: [
        "solvent",
        "disordered solvent"
      ],
      defaultComment: "disordered solvent molecule"
    },
    {
      label: "coordinated solvent molecule",
      aliases: [
        "coordinated solvent"
      ],
      defaultComment: "disordered coordinated solvent molecule"
    },
    {
      label: "counterion",
      aliases: [
        "anion",
        "cation"
      ],
      defaultComment: "disordered counterion"
    },
    
    {
      label: "ligand atoms",
      aliases: [
        "L",
        "ligand"
      ],
      defaultComment: "disordered ligand atoms"
    },    

    /*
      Common neutral solvent molecules
    */

    {
      label: "THF molecule",
      aliases: [
        "tetrahydrofuran",
        "THF"
      ],
      defaultComment: "disordered THF molecule"
    },
    {
      label: "Et₂O molecule",
      aliases: [
        "Et2O",
        "Et₂O",
        "ether",
        "diethyl ether",
        "diethyl ether molecule"
      ],
      defaultComment: "disordered diethyl ether molecule"
    },
    {
      label: "CH₂Cl₂ molecule",
      aliases: [
        "DCM",
        "CH2Cl2",
        "CH₂Cl₂",
        "dichloromethane",
        "dichloromethane molecule",
        "methylene chloride"
      ],
      defaultComment: "disordered dichloromethane molecule"
    },
    {
      label: "CHCl₃ molecule",
      aliases: [
        "CHCl3",
        "CHCl₃",
        "chloroform",
        "chloroform molecule"
      ],
      defaultComment: "disordered chloroform molecule"
    },
    {
      label: "CH₃CN molecule",
      aliases: [
        "MeCN",
        "CH3CN",
        "CH₃CN",
        "acetonitrile",
        "acetonitrile molecule"
      ],
      defaultComment: "disordered acetonitrile molecule"
    },
    {
      label: "MeOH molecule",
      aliases: [
        "methanol",
        "methanol molecule",
        "MeOH"
      ],
      defaultComment: "disordered methanol molecule"
    },
    {
      label: "EtOH molecule",
      aliases: [
        "ethanol",
        "ethanol molecule",
        "EtOH"
      ],
      defaultComment: "disordered ethanol molecule"
    },
    {
      label: "H₂O molecule",
      aliases: [
        "H2O",
        "H₂O",
        "water",
        "water molecule"
      ],
      defaultComment: "disordered water molecule"
    },
    {
      label: "toluene molecule",
      aliases: [
        "PhMe",
        "toluene"
      ],
      defaultComment: "disordered toluene molecule"
    },
    {
      label: "C₆H₆ molecule",
      aliases: [
        "C6H6",
        "C₆H₆",
        "benzene",
        "benzene molecule"
      ],
      defaultComment: "disordered benzene molecule"
    },
    {
      label: "hexane molecule",
      aliases: [
        "n-hexane",
        "hexane"
      ],
      defaultComment: "disordered hexane molecule"
    },
    {
      label: "pentane molecule",
      aliases: [
        "n-pentane",
        "pentane"
      ],
      defaultComment: "disordered pentane molecule"
    },

    /*
      Common disordered organic moieties
    */

    {
      label: "phenyl ring",
      aliases: [
        "Ph",
        "Ph group",
        "phenyl group",
        "phenyl"
      ],
      defaultComment: "disordered phenyl ring"
    },
    {
      label: "tert-butyl group",
      aliases: [
        "tBu",
        "t-Bu",
        "tBu group",
        "t-Bu group",
        "tert-butyl"
      ],
      defaultComment: "disordered tert-butyl group"
    },
    {
      label: "alkyl chain",
      aliases: [
        "alkyl group",
        "alkyl"
      ],
      defaultComment: "disordered alkyl chain"
    },
    {
      label: "CF₃ group",
      aliases: [
        "CF3",
        "CF₃",
        "trifluoromethyl",
        "trifluoromethyl group"
      ],
      defaultComment: "disordered trifluoromethyl group"
    },
    {
      label: "fluorinated alkyl chain",
      aliases: [
        "perfluoroalkyl chain",
        "fluoroalkyl chain"
      ],
      defaultComment: "disordered fluorinated alkyl chain"
    },

    /*
      Common anions
    */

    {
      label: "PF₆⁻ anion",
      aliases: [
        "PF6",
        "PF6-",
        "PF6 anion",
        "PF₆",
        "PF₆⁻",
        "PF₆ anion",
        "hexafluorophosphate",
        "hexafluorophosphate anion"
      ],
      defaultComment: "disordered hexafluorophosphate anion"
    },
    {
      label: "BF₄⁻ anion",
      aliases: [
        "BF4",
        "BF4-",
        "BF4 anion",
        "BF₄",
        "BF₄⁻",
        "BF₄ anion",
        "tetrafluoroborate",
        "tetrafluoroborate anion"
      ],
      defaultComment: "disordered tetrafluoroborate anion"
    },
    {
      label: "OTf⁻ anion",
      aliases: [
        "OTf",
        "OTf-",
        "OTf⁻",
        "OTf anion",
        "triflate",
        "triflate anion",
        "trifluoromethanesulfonate",
        "trifluoromethanesulfonate anion"
      ],
      defaultComment: "disordered triflate anion"
    },
    {
      label: "ClO₄⁻ anion",
      aliases: [
        "ClO4",
        "ClO4-",
        "ClO4 anion",
        "ClO₄",
        "ClO₄⁻",
        "ClO₄ anion",
        "perchlorate",
        "perchlorate anion"
      ],
      defaultComment: "disordered perchlorate anion"
    },
    {
      label: "NO₃⁻ anion",
      aliases: [
        "NO3",
        "NO3-",
        "NO3 anion",
        "NO₃",
        "NO₃⁻",
        "NO₃ anion",
        "nitrate",
        "nitrate anion"
      ],
      defaultComment: "disordered nitrate anion"
    },
    {
      label: "BPh₄⁻ anion",
      aliases: [
        "BPh4",
        "BPh4-",
        "BPh4 anion",
        "BPh₄",
        "BPh₄⁻",
        "tetraphenylborate",
        "tetraphenylborate anion"
      ],
      defaultComment: "disordered tetraphenylborate anion"
    },
    {
      label: "SbF₆⁻ anion",
      aliases: [
        "SbF6",
        "SbF6-",
        "SbF6 anion",
        "SbF₆",
        "SbF₆⁻",
        "hexafluoroantimonate",
        "hexafluoroantimonate anion"
      ],
      defaultComment: "disordered hexafluoroantimonate anion"
    },
    {
      label: "AsF₆⁻ anion",
      aliases: [
        "AsF6",
        "AsF6-",
        "AsF6 anion",
        "AsF₆",
        "AsF₆⁻",
        "hexafluoroarsenate",
        "hexafluoroarsenate anion"
      ],
      defaultComment: "disordered hexafluoroarsenate anion"
    },
    {
      label: "CF₃SO₃⁻ anion",
      aliases: [
        "CF3SO3",
        "CF3SO3-",
        "CF₃SO₃",
        "CF₃SO₃⁻",
        "triflate",
        "OTf",
        "OTf-",
        "OTf⁻"
      ],
      defaultComment: "disordered triflate anion"
    },
    {
      label: "CH₃SO₃⁻ anion",
      aliases: [
        "CH3SO3",
        "CH3SO3-",
        "CH₃SO₃",
        "CH₃SO₃⁻",
        "mesylate",
        "methanesulfonate",
        "methanesulfonate anion"
      ],
      defaultComment: "disordered methanesulfonate anion"
    },
    {
      label: "TsO⁻ anion",
      aliases: [
        "TsO",
        "TsO-",
        "TsO⁻",
        "tosylate",
        "p-toluenesulfonate",
        "p-toluenesulfonate anion"
      ],
      defaultComment: "disordered tosylate anion"
    },

    /*
      Common cations
    */

    {
      label: "Na⁺ cation",
      aliases: [
        "Na",
        "Na+",
        "Na⁺",
        "sodium",
        "sodium cation"
      ],
      defaultComment: "disordered sodium cation"
    },
    {
      label: "K⁺ cation",
      aliases: [
        "K",
        "K+",
        "K⁺",
        "potassium",
        "potassium cation"
      ],
      defaultComment: "disordered potassium cation"
    },
    {
      label: "NH₄⁺ cation",
      aliases: [
        "NH4",
        "NH4+",
        "NH₄",
        "NH₄⁺",
        "ammonium",
        "ammonium cation"
      ],
      defaultComment: "disordered ammonium cation"
    },
    {
      label: "NEt₄⁺ cation",
      aliases: [
        "NEt4",
        "NEt4+",
        "NEt₄",
        "NEt₄⁺",
        "tetraethylammonium",
        "tetraethylammonium cation"
      ],
      defaultComment: "disordered tetraethylammonium cation"
    },
    {
      label: "NBu₄⁺ cation",
      aliases: [
        "NBu4",
        "NBu4+",
        "NBu₄",
        "NBu₄⁺",
        "tetrabutylammonium",
        "tetrabutylammonium cation"
      ],
      defaultComment: "disordered tetrabutylammonium cation"
    },
    {
      label: "PPh₄⁺ cation",
      aliases: [
        "PPh4",
        "PPh4+",
        "PPh₄",
        "PPh₄⁺",
        "tetraphenylphosphonium",
        "tetraphenylphosphonium cation"
      ],
      defaultComment: "disordered tetraphenylphosphonium cation"
    }
  ];

  CIFLord.MoietyLibraryLabels = CIFLord.MoietyLibrary.map(function (entry) {
    return entry.label;
  });

  CIFLord.findMoietyLibraryEntry = function (value) {
    value = String(value || "").trim().toLowerCase();

    if (!value) {
      return null;
    }

    return CIFLord.MoietyLibrary.find(function (entry) {
      if (String(entry.label || "").toLowerCase() === value) {
        return true;
      }

      return (entry.aliases || []).some(function (alias) {
        return String(alias || "").toLowerCase() === value;
      });
    }) || null;
  };
})();