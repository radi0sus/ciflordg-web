(function () {
  "use strict";

  window.addEventListener("DOMContentLoaded", function () {
    var state = CIFLord.Core.createInitialState();
    window.appState = state;
    CIFLord.UI.init(state);
  });
})();