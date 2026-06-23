(function () {
  "use strict";

  function updateHeaderHeightVariable() {
    var header = document.querySelector(".app-header");

    if (!header) {
      return;
    }

    var height = header.getBoundingClientRect().height;

    document.documentElement.style.setProperty(
      "--app-header-height",
      height + "px"
    );
  }

  window.addEventListener("DOMContentLoaded", function () {
    updateHeaderHeightVariable();

    var header = document.querySelector(".app-header");

    if (header && window.ResizeObserver) {
      var observer = new ResizeObserver(function () {
        updateHeaderHeightVariable();
      });

      observer.observe(header);
    }

    window.addEventListener("resize", updateHeaderHeightVariable);

    var state = CIFLord.Core.createInitialState();
    window.appState = state;
    CIFLord.UI.init(state);

    updateHeaderHeightVariable();
  });
})();