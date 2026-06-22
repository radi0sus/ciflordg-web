(function () {
  "use strict";

  window.CIFLord = window.CIFLord || {};

  function stripInlineComment(line) {
    var out = "";
    var quote = null;

    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);

      if ((ch === "'" || ch === "\"") && !quote) {
        quote = ch;
        out += ch;
        continue;
      }

      if (quote && ch === quote) {
        quote = null;
        out += ch;
        continue;
      }

      if (!quote && ch === "#") {
        break;
      }

      out += ch;
    }

    return out;
  }

  function tokenizeLine(line) {
    var tokens = [];
    var i = 0;
    var len = line.length;

    while (i < len) {
      while (i < len && /\s/.test(line.charAt(i))) {
        i++;
      }

      if (i >= len) {
        break;
      }

      var ch = line.charAt(i);

      if (ch === "'" || ch === "\"") {
        var quote = ch;
        i++;

        var value = "";

        while (i < len) {
          ch = line.charAt(i);

          if (ch === quote) {
            i++;
            break;
          }

          value += ch;
          i++;
        }

        tokens.push(value);
        continue;
      }

      var start = i;

      while (i < len && !/\s/.test(line.charAt(i))) {
        i++;
      }

      tokens.push(line.slice(start, i));
    }

    return tokens;
  }

  function readMultilineValue(lines, startIndex) {
    var valueLines = [];
    var i = startIndex;

    if (i >= lines.length || lines[i].charAt(0) !== ";") {
      return {
        value: "",
        nextIndex: startIndex
      };
    }

    valueLines.push(lines[i].slice(1));
    i++;

    while (i < lines.length) {
      if (lines[i].charAt(0) === ";") {
        i++;
        break;
      }

      valueLines.push(lines[i]);
      i++;
    }

    return {
      value: valueLines.join("\n"),
      nextIndex: i
    };
  }

  function isStopLineForLoop(line) {
    var t = line.trim();

    if (!t) {
      return false;
    }

    if (t.indexOf("data_") === 0) {
      return true;
    }

    if (t === "loop_") {
      return true;
    }

    if (t.charAt(0) === "_") {
      return true;
    }

    return false;
  }

  function makeLoopIndex(loops) {
    var index = {};

    loops.forEach(function (loop) {
      loop.headers.forEach(function (header) {
        index[header] = loop;
      });
    });

    return index;
  }

  function findLoopContaining(parsed, headerName) {
    for (var i = 0; i < parsed.loops.length; i++) {
      if (parsed.loops[i].headers.indexOf(headerName) !== -1) {
        return parsed.loops[i];
      }
    }

    return null;
  }

  function parse(text) {
    var lines = String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n");

    var result = {
      dataName: "",
      items: {},
      loops: [],
      loopByHeader: {},
      warnings: [],
      rawLines: lines
    };

    var i = 0;

    while (i < lines.length) {
      var raw = lines[i];
      var line = stripInlineComment(raw).trim();

      if (!line) {
        i++;
        continue;
      }

      if (line.indexOf("data_") === 0) {
        result.dataName = line.replace(/^data_/, "").trim();
        i++;
        continue;
      }

      if (line === "loop_") {
        var loopStart = i;
        i++;

        var headers = [];

        while (i < lines.length) {
          var headerLine = stripInlineComment(lines[i]).trim();

          if (!headerLine) {
            i++;
            continue;
          }

          if (headerLine.charAt(0) === "_") {
            var headerTokens = tokenizeLine(headerLine);

            if (headerTokens.length) {
              headers.push(headerTokens[0]);
            }

            i++;
            continue;
          }

          break;
        }

        var dataTokens = [];

        while (i < lines.length) {
          var dataRaw = lines[i];
          var dataLineTrim = dataRaw.trim();

          if (isStopLineForLoop(dataRaw)) {
            break;
          }

          if (!dataLineTrim || dataLineTrim.charAt(0) === "#") {
            i++;
            continue;
          }

          if (dataRaw.charAt(0) === ";") {
            var ml = readMultilineValue(lines, i);
            dataTokens.push(ml.value);
            i = ml.nextIndex;
            continue;
          }

          var clean = stripInlineComment(dataRaw);
          var tokens = tokenizeLine(clean);

          dataTokens = dataTokens.concat(tokens);
          i++;
        }

        var rows = [];
        var width = headers.length;

        if (!width) {
          result.warnings.push("Empty loop found at line " + (loopStart + 1) + ".");
        } else {
          if (dataTokens.length % width !== 0) {
            result.warnings.push(
              "Loop at line " + (loopStart + 1) +
              " has " + dataTokens.length +
              " values for " + width +
              " headers. Some trailing values may be ignored."
            );
          }

          for (var r = 0; r + width <= dataTokens.length; r += width) {
            rows.push(dataTokens.slice(r, r + width));
          }
        }

        result.loops.push({
          startLine: loopStart + 1,
          endLine: i,
          headers: headers,
          rows: rows
        });

        continue;
      }

      if (line.charAt(0) === "_") {
        var tokensLine = tokenizeLine(line);
        var key = tokensLine[0];
        var value = tokensLine.slice(1).join(" ");

        i++;

        if (!value && i < lines.length) {
          if (lines[i].charAt(0) === ";") {
            var multi = readMultilineValue(lines, i);
            value = multi.value;
            i = multi.nextIndex;
          } else {
            var nextLine = stripInlineComment(lines[i]).trim();

            if (nextLine && nextLine.charAt(0) !== "_" && nextLine !== "loop_") {
              var nextTokens = tokenizeLine(nextLine);
              value = nextTokens.join(" ");
              i++;
            }
          }
        }

        result.items[key] = value;
        continue;
      }

      i++;
    }

    result.loopByHeader = makeLoopIndex(result.loops);

    if (!result.dataName) {
      result.warnings.push("No data_ block found.");
    }

    return result;
  }

  CIFLord.Parser = {
    parse: parse,
    findLoopContaining: findLoopContaining,
    tokenizeLine: tokenizeLine
  };
})();