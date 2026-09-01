(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const rail = document.getElementById('verticalControl');
  const startBtn = document.getElementById('startBtn');
  const routeChoice = document.getElementById('routeChoice');
  if (!canvas || !rail) return;

  const W = canvas.width;
  const H = canvas.height;
  const FIXED_X = 150;
  const POINTER_ID = 424242;
  const MIN_Y = 46;
  const MAX_Y = H - 46;
  const SENSITIVITY = 1.08;

  let active = false;
  let controlId = null;
  let startClientY = 0;
  let startShipY = H / 2;
  let estimateY = H / 2;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // Hide the obsolete on-canvas direct-drag hint from the previous control scheme.
  const renderContext = canvas.getContext('2d');
  const originalFillText = renderContext.fillText.bind(renderContext);
  const originalStrokeRect = renderContext.strokeRect.bind(renderContext);
  renderContext.fillText = function(text, ...args) {
    if (text === 'HOLD + DRAG SHIP') return;
    return originalFillText(text, ...args);
  };
  renderContext.strokeRect = function(x, y, w, h) {
    if (w === 52 && h === 38) return;
    return originalStrokeRect(x, y, w, h);
  };

  function toClient(x, y) {
    const r = canvas.getBoundingClientRect();
    return {
      x: r.left + x * r.width / W,
      y: r.top + y * r.height / H
    };
  }

  function canvasUnitsPerClientY() {
    const r = canvas.getBoundingClientRect();
    return H / Math.max(1, r.height);
  }

  function syntheticPointer(type, y, buttons = 1) {
    const p = toClient(FIXED_X, y);
    let ev;
    if (typeof PointerEvent === 'function') {
      ev = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: POINTER_ID,
        pointerType: 'mouse',
        isPrimary: true,
        clientX: p.x,
        clientY: p.y,
        buttons
      });
    } else {
      ev = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(ev, {
        pointerId: { value: POINTER_ID },
        pointerType: { value: 'mouse' },
        isPrimary: { value: true },
        clientX: { value: p.x },
        clientY: { value: p.y },
        buttons: { value: buttons }
      });
    }
    Object.defineProperty(ev, '__pswRail', { value: true });
    canvas.dispatchEvent(ev);
  }

  // Synthetic pointers are not browser-owned pointers, so native pointer capture
  // would throw in some browsers. Keep capture for real pointers only.
  const nativeSetPointerCapture = canvas.setPointerCapture?.bind(canvas);
  const nativeReleasePointerCapture = canvas.releasePointerCapture?.bind(canvas);
  if (nativeSetPointerCapture) {
    canvas.setPointerCapture = id => {
      if (id === POINTER_ID) return;
      try { nativeSetPointerCapture(id); } catch (_) {}
    };
  }
  if (nativeReleasePointerCapture) {
    canvas.releasePointerCapture = id => {
      if (id === POINTER_ID) return;
      try { nativeReleasePointerCapture(id); } catch (_) {}
    };
  }

  // Movement comes only from the dedicated rail, never by touching the ship/canvas.
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(type => {
    canvas.addEventListener(type, ev => {
      if (!ev.__pswRail) {
        if (ev.cancelable) ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    }, { capture: true, passive: false });
  });
  ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(type => {
    canvas.addEventListener(type, ev => {
      if (ev.cancelable) ev.preventDefault();
      ev.stopImmediatePropagation();
    }, { capture: true, passive: false });
  });

  // Lock out forward/back movement on keyboard. W/S and Up/Down remain available.
  function blockHorizontalKeys(ev) {
    const k = ev.key.toLowerCase();
    if (k === 'arrowleft' || k === 'arrowright' || k === 'a' || k === 'd') {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  }
  canvas.addEventListener('keydown', blockHorizontalKeys, true);
  canvas.addEventListener('keyup', blockHorizontalKeys, true);

  function beginRail(clientY, id = POINTER_ID) {
    if (active) return;
    active = true;
    controlId = id;
    startClientY = clientY;
    startShipY = estimateY;
    rail.classList.add('active');
    syntheticPointer('pointerdown', estimateY, 1);
  }

  function moveRail(clientY) {
    if (!active) return;
    const delta = (clientY - startClientY) * canvasUnitsPerClientY() * SENSITIVITY;
    estimateY = clamp(startShipY + delta, MIN_Y, MAX_Y);
    syntheticPointer('pointermove', estimateY, 1);
  }

  function finishRail() {
    if (!active) return;
    syntheticPointer('pointerup', estimateY, 0);
    active = false;
    controlId = null;
    rail.classList.remove('active');
  }

  if (typeof PointerEvent === 'function') {
    rail.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      beginRail(ev.clientY, ev.pointerId);
      try { rail.setPointerCapture(ev.pointerId); } catch (_) {}
    }, { passive: false });
    rail.addEventListener('pointermove', ev => {
      if (!active || ev.pointerId !== controlId) return;
      ev.preventDefault();
      moveRail(ev.clientY);
    }, { passive: false });
    rail.addEventListener('pointerup', ev => {
      if (ev.pointerId !== controlId) return;
      ev.preventDefault();
      finishRail();
    }, { passive: false });
    rail.addEventListener('pointercancel', ev => {
      if (ev.pointerId === controlId) finishRail();
    }, { passive: false });
  } else {
    let touchId = null;
    rail.addEventListener('touchstart', ev => {
      if (active || !ev.changedTouches.length) return;
      const t = ev.changedTouches[0];
      touchId = t.identifier;
      ev.preventDefault();
      beginRail(t.clientY, touchId);
    }, { passive: false });
    rail.addEventListener('touchmove', ev => {
      if (!active) return;
      for (const t of ev.touches) {
        if (t.identifier === touchId) {
          ev.preventDefault();
          moveRail(t.clientY);
          break;
        }
      }
    }, { passive: false });
    const finishTouch = ev => {
      for (const t of ev.changedTouches) {
        if (t.identifier === touchId) {
          ev.preventDefault();
          touchId = null;
          finishRail();
          break;
        }
      }
    };
    rail.addEventListener('touchend', finishTouch, { passive: false });
    rail.addEventListener('touchcancel', finishTouch, { passive: false });

    rail.addEventListener('mousedown', ev => {
      ev.preventDefault();
      beginRail(ev.clientY, 1);
    });
    window.addEventListener('mousemove', ev => { if (active) moveRail(ev.clientY); });
    window.addEventListener('mouseup', () => finishRail());
  }

  function resetControl() {
    finishRail();
    estimateY = H / 2;
    startShipY = estimateY;
  }

  startBtn?.addEventListener('click', resetControl);
  routeChoice?.addEventListener('click', resetControl);
})();
