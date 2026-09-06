// Leichter, eigener Farbwähler als Ersatz für den nativen <input type="color">-Dialog.
// Die ursprünglichen <input type="color">-Elemente bleiben im DOM (nur visuell versteckt),
// damit sämtlicher bestehender Code (byId(...).value, addEventListener('input', ...)) unverändert funktioniert.
(function () {
  var STORAGE_KEY = 'lineupSavedColors';
  var MAX_SLOTS = 18;

  function loadSavedColors() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(raw)
        ? raw.filter(function (c) {
            return typeof c === 'string';
          })
        : [];
    } catch (e) {
      return [];
    }
  }

  function persistSavedColors(colors) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
    } catch (e) {
      /* ignore */
    }
  }

  var openPopover = null;
  // Aufräum-Funktion der aktuell offenen Instanz (entfernt u.a. die window-weiten
  // Drag-Listener aus openPickerFor). Wird von closePopover() aufgerufen, damit bei
  // jedem Öffnen/Schließen keine Listener auf window liegen bleiben (Memory-Leak).
  var closeActivePicker = null;

  function closePopover() {
    if (openPopover) {
      if (closeActivePicker) closeActivePicker();
      closeActivePicker = null;
      openPopover.remove();
      openPopover = null;
      document.removeEventListener('mousedown', onDocMouseDown, true);
      document.removeEventListener('keydown', onDocKeyDown, true);
    }
  }

  function onDocMouseDown(event) {
    if (openPopover && !openPopover.contains(event.target)) closePopover();
  }

  function onDocKeyDown(event) {
    if (event.key === 'Escape') closePopover();
  }

  function normalizeHex(value) {
    if (!value) return null;
    var v = value.trim();
    if (/^#([0-9a-fA-F]{6})$/.test(v)) return v.toLowerCase();
    if (/^([0-9a-fA-F]{6})$/.test(v)) return ('#' + v).toLowerCase();
    if (/^#([0-9a-fA-F]{3})$/.test(v)) {
      return (
        '#' +
        v
          .slice(1)
          .split('')
          .map(function (c) {
            return c + c;
          })
          .join('')
      ).toLowerCase();
    }
    return null;
  }

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    return (
      '#' +
      [r, g, b]
        .map(function (c) {
          return Math.max(0, Math.min(255, Math.round(c)))
            .toString(16)
            .padStart(2, '0');
        })
        .join('')
    );
  }

  function rgbToHsv(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    var max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    var d = max - min,
      h = 0,
      s = max === 0 ? 0 : d / max,
      v = max;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h: h, s: s, v: v };
  }

  function hsvToRgb(h, s, v) {
    var c = v * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = v - c;
    var r, g, b;
    if (h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }

  function setInputValue(input, hex) {
    input.value = hex;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function openPickerFor(input, swatchButton) {
    closePopover();

    var startHex = normalizeHex(input.value) || '#000000';
    var startRgb = hexToRgb(startHex);
    var hsv = rgbToHsv(startRgb.r, startRgb.g, startRgb.b);
    var savedColors = loadSavedColors();

    var pop = document.createElement('div');
    pop.className = 'cp-popover';

    var areaWrap = document.createElement('div');
    areaWrap.className = 'cp-area-wrap';
    var area = document.createElement('canvas');
    area.className = 'cp-area';
    area.width = 248;
    area.height = 180;
    var areaCursor = document.createElement('div');
    areaCursor.className = 'cp-area-cursor';
    areaWrap.appendChild(area);
    areaWrap.appendChild(areaCursor);
    pop.appendChild(areaWrap);

    var hueWrap = document.createElement('div');
    hueWrap.className = 'cp-hue-wrap';
    var hueSlider = document.createElement('input');
    hueSlider.type = 'range';
    hueSlider.className = 'cp-hue-slider';
    hueSlider.min = '0';
    hueSlider.max = '359';
    hueSlider.step = '1';
    hueSlider.value = String(Math.round(hsv.h));
    hueWrap.appendChild(hueSlider);
    pop.appendChild(hueWrap);

    var hexRow = document.createElement('div');
    hexRow.className = 'cp-hex-row';
    var hexPreview = document.createElement('span');
    hexPreview.className = 'cp-hex-preview';
    hexPreview.style.background = startHex;
    var hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'cp-hex-input';
    hexInput.maxLength = 7;
    hexInput.value = startHex;
    hexInput.spellcheck = false;
    hexInput.autocomplete = 'off';
    var saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'cp-save-button';
    saveButton.title = typeof t === 'function' ? t('colorPickerSave') : 'Farbe speichern';
    saveButton.textContent = '+';
    hexRow.appendChild(hexPreview);
    hexRow.appendChild(hexInput);
    hexRow.appendChild(saveButton);
    pop.appendChild(hexRow);

    var slotsLabel = document.createElement('div');
    slotsLabel.className = 'cp-slots-label';
    slotsLabel.textContent = typeof t === 'function' ? t('colorPickerSavedColors') : 'Gespeicherte Farben';
    pop.appendChild(slotsLabel);

    var grid = document.createElement('div');
    grid.className = 'cp-grid';
    pop.appendChild(grid);

    var ctx = area.getContext('2d');

    function drawArea() {
      var w = area.width,
        h = area.height;
      var hueRgb = hsvToRgb(hsv.h, 1, 1);
      var hueHex = rgbToHex(hueRgb.r, hueRgb.g, hueRgb.b);
      ctx.fillStyle = hueHex;
      ctx.fillRect(0, 0, w, h);
      var satGrad = ctx.createLinearGradient(0, 0, w, 0);
      satGrad.addColorStop(0, '#ffffff');
      satGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = satGrad;
      ctx.fillRect(0, 0, w, h);
      var valGrad = ctx.createLinearGradient(0, 0, 0, h);
      valGrad.addColorStop(0, 'rgba(0,0,0,0)');
      valGrad.addColorStop(1, '#000000');
      ctx.fillStyle = valGrad;
      ctx.fillRect(0, 0, w, h);
    }

    function currentRgb() {
      return hsvToRgb(hsv.h, hsv.s, hsv.v);
    }

    function updateCursor() {
      var w = area.width,
        h = area.height;
      areaCursor.style.left = hsv.s * w + 'px';
      areaCursor.style.top = (1 - hsv.v) * h + 'px';
      var rgb = currentRgb();
      areaCursor.style.background = rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    function applyFromHsv(commit) {
      var rgb = currentRgb();
      var hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      hexInput.value = hex;
      hexPreview.style.background = hex;
      swatchButton.style.background = hex;
      updateCursor();
      if (commit) setInputValue(input, hex);
    }

    function setFromHex(hex) {
      var rgb = hexToRgb(hex);
      hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      hueSlider.value = String(Math.round(hsv.h));
      drawArea();
      applyFromHsv(true);
    }

    function renderSlots() {
      grid.innerHTML = '';
      for (var i = 0; i < MAX_SLOTS; i++) {
        var hex = savedColors[i];
        var slot = document.createElement('button');
        slot.type = 'button';
        slot.className = 'cp-swatch' + (hex ? '' : ' cp-swatch-empty');
        if (hex) {
          slot.style.background = hex;
          slot.title = hex;
          slot.addEventListener(
            'click',
            (function (h) {
              return function () {
                setFromHex(h);
                closePopover();
              };
            })(hex),
          );

          var del = document.createElement('span');
          del.className = 'cp-swatch-remove';
          del.textContent = '×';
          del.title = typeof t === 'function' ? t('colorPickerRemove') : 'Entfernen';
          del.addEventListener(
            'click',
            (function (idx) {
              return function (event) {
                event.stopPropagation();
                savedColors.splice(idx, 1);
                persistSavedColors(savedColors);
                renderSlots();
              };
            })(i),
          );
          slot.appendChild(del);
        } else {
          slot.disabled = true;
          slot.setAttribute('aria-hidden', 'true');
        }
        grid.appendChild(slot);
      }
    }

    function pickFromEvent(event) {
      var rect = area.getBoundingClientRect();
      var x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      var y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      hsv.s = x / rect.width;
      hsv.v = 1 - y / rect.height;
      applyFromHsv(true);
    }

    var dragging = false;
    function onWindowMouseMove(event) {
      if (dragging) pickFromEvent(event);
    }
    function onWindowMouseUp() {
      dragging = false;
    }
    area.addEventListener('mousedown', function (event) {
      dragging = true;
      pickFromEvent(event);
    });
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);
    // Diese beiden Listener hängen an window (nicht am Popover-Element selbst) und würden beim
    // Schließen sonst nicht automatisch entfernt - deshalb hier für closePopover() vormerken.
    closeActivePicker = function () {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    };
    area.addEventListener(
      'touchstart',
      function (event) {
        dragging = true;
        pickFromEvent(event.touches[0]);
      },
      { passive: true },
    );
    area.addEventListener(
      'touchmove',
      function (event) {
        if (dragging) pickFromEvent(event.touches[0]);
      },
      { passive: true },
    );
    area.addEventListener('touchend', function () {
      dragging = false;
    });

    hueSlider.addEventListener('input', function () {
      hsv.h = Number(hueSlider.value);
      drawArea();
      applyFromHsv(true);
    });

    saveButton.addEventListener('click', function () {
      var hex = normalizeHex(hexInput.value) || rgbToHex(currentRgb().r, currentRgb().g, currentRgb().b);
      var existingIndex = savedColors.indexOf(hex);
      if (existingIndex !== -1) savedColors.splice(existingIndex, 1);
      savedColors.unshift(hex);
      if (savedColors.length > MAX_SLOTS) savedColors.length = MAX_SLOTS;
      persistSavedColors(savedColors);
      renderSlots();
    });

    hexInput.addEventListener('input', function () {
      var normalized = normalizeHex(hexInput.value);
      if (normalized) {
        var rgb = hexToRgb(normalized);
        hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        hueSlider.value = String(Math.round(hsv.h));
        drawArea();
        hexPreview.style.background = normalized;
        swatchButton.style.background = normalized;
        updateCursor();
        setInputValue(input, normalized);
      }
    });
    hexInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        closePopover();
      }
    });

    // In einem offenen <dialog> muss der Popover als Kind des Dialogs eingehängt werden,
    // da <dialog> in der Browser-"Top-Layer"-Ebene gerendert wird und ein an <body>
    // angehängtes Element sonst dahinter verschwindet.
    var hostDialog = input.closest('dialog');
    var host = hostDialog || document.body;
    host.appendChild(pop);
    pop.style.position = 'fixed';

    renderSlots();
    drawArea();
    updateCursor();

    var rect = swatchButton.getBoundingClientRect();
    var popRect = pop.getBoundingClientRect();
    var left = rect.left;
    var top = rect.bottom + 6;
    if (left + popRect.width > window.innerWidth - 8) {
      left = window.innerWidth - popRect.width - 8;
    }
    if (left < 8) left = 8;
    if (top + popRect.height > window.innerHeight - 8) {
      top = rect.top - popRect.height - 6;
    }
    if (top < 8) top = 8;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';

    openPopover = pop;
    setTimeout(function () {
      document.addEventListener('mousedown', onDocMouseDown, true);
      document.addEventListener('keydown', onDocKeyDown, true);
    }, 0);
  }

  function enhance(input) {
    if (input.dataset.cpEnhanced) return;
    input.dataset.cpEnhanced = '1';

    var wrapper = document.createElement('span');
    wrapper.className = 'cp-wrapper';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    input.classList.add('cp-native-hidden');

    var swatchButton = document.createElement('button');
    swatchButton.type = 'button';
    swatchButton.className = 'cp-swatch-trigger';
    swatchButton.style.background = input.value || '#000000';
    swatchButton.setAttribute('aria-label', typeof t === 'function' ? t('colorPickerChoose') : 'Farbe wählen');
    wrapper.appendChild(swatchButton);

    swatchButton.addEventListener('click', function (event) {
      event.preventDefault();
      openPickerFor(input, swatchButton);
    });

    // Falls das Feld in einem <label> steckt, leitet ein Klick auf das Label
    // (z.B. auf die Beschriftung) einen echten Klick an das native Input weiter,
    // was sonst den alten Systemdialog öffnen würde. Das fangen wir hier ab.
    input.addEventListener(
      'click',
      function (event) {
        event.preventDefault();
        event.stopPropagation();
        openPickerFor(input, swatchButton);
      },
      true,
    );

    // Der bestehende App-Code setzt Farbwerte teils direkt per `input.value = ...`
    // (z.B. beim Teamwechsel oder im Bearbeiten-Dialog), ohne ein 'input'-Event
    // auszulösen. Damit die Vorschau dabei trotzdem aktuell bleibt, wird die
    // native value-Eigenschaft überschrieben und jede Zuweisung abgefangen.
    var nativeDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(input, 'value', {
      configurable: true,
      enumerable: true,
      get: function () {
        return nativeDescriptor.get.call(input);
      },
      set: function (val) {
        nativeDescriptor.set.call(input, val);
        swatchButton.style.background = nativeDescriptor.get.call(input);
      },
    });

    // Falls der Wert dennoch über ein 'input'-Event geändert wird, ebenfalls syncen.
    input.addEventListener('input', function () {
      swatchButton.style.background = input.value;
    });
  }

  function enhanceAll() {
    document.querySelectorAll('input[type="color"]').forEach(enhance);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceAll);
  } else {
    enhanceAll();
  }

  // Für dynamisch erzeugte Farbfelder (falls in Zukunft welche hinzukommen).
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches('input[type="color"]')) enhance(node);
        if (node.querySelectorAll) node.querySelectorAll('input[type="color"]').forEach(enhance);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
