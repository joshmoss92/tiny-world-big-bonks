(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const pad = document.getElementById('verticalControl');
  const startBtn = document.getElementById('startBtn');
  const routeChoice = document.getElementById('routeChoice');
  if (!canvas || !pad) return;

  const W = canvas.width;
  const H = canvas.height;
  const POINTER_ID = 424242;
  const MIN_X = 95;
  const MAX_X = 235;
  const MIN_Y = 46;
  const MAX_Y = H - 46;
  const X_SENSITIVITY = 0.68;
  const Y_SENSITIVITY = 1.08;

  let active = false;
  let controlId = null;
  let startClientX = 0;
  let startClientY = 0;
  let startShipX = 150;
  let startShipY = H / 2;
  let estimateX = 150;
  let estimateY = H / 2;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // Keep the game canvas visually clean: status lives in the compact HUD above.
  const renderContext = canvas.getContext('2d');
  const originalFillText = renderContext.fillText.bind(renderContext);
  const originalStrokeRect = renderContext.strokeRect.bind(renderContext);
  const hiddenExact = new Set(['DODGE ENERGY','Cloudberry Run','Ember Canyon','Moonlit Ruins','Thunder Reach','Candy Nebula','HOLD + DRAG SHIP']);
  renderContext.fillText = function(text, ...args) {
    const value = String(text);
    if (hiddenExact.has(value) || value.startsWith('Bombs: ') || value.startsWith('Combo x') || value.startsWith('Pulse Cannon') || value.startsWith('Star Scatter') || value.startsWith('Prism Beam') || value.startsWith('Firefly Seekers') || value.startsWith('Nova Lance')) return;
    return originalFillText(text, ...args);
  };
  renderContext.strokeRect = function(x, y, w, h) {
    if (w === 52 && h === 38) return;
    return originalStrokeRect(x, y, w, h);
  };

  function canvasScale() {
    const r = canvas.getBoundingClientRect();
    return { x: W / Math.max(1, r.width), y: H / Math.max(1, r.height) };
  }

  function toClient(x, y) {
    const r = canvas.getBoundingClientRect();
    return { x: r.left + x * r.width / W, y: r.top + y * r.height / H };
  }

  function syntheticPointer(type, x, y, buttons = 1) {
    const p = toClient(x, y);
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
        pointerId: { value: POINTER_ID }, pointerType: { value: 'mouse' }, isPrimary: { value: true },
        clientX: { value: p.x }, clientY: { value: p.y }, buttons: { value: buttons }
      });
    }
    Object.defineProperty(ev, '__pswPad', { value: true });
    canvas.dispatchEvent(ev);
  }

  const nativeSetPointerCapture = canvas.setPointerCapture?.bind(canvas);
  const nativeReleasePointerCapture = canvas.releasePointerCapture?.bind(canvas);
  if (nativeSetPointerCapture) canvas.setPointerCapture = id => { if (id !== POINTER_ID) { try { nativeSetPointerCapture(id); } catch (_) {} } };
  if (nativeReleasePointerCapture) canvas.releasePointerCapture = id => { if (id !== POINTER_ID) { try { nativeReleasePointerCapture(id); } catch (_) {} } };

  // The game canvas itself is display-only for movement. All movement comes from the left pad.
  ['pointerdown','pointermove','pointerup','pointercancel'].forEach(type => {
    canvas.addEventListener(type, ev => {
      if (!ev.__pswPad) {
        if (ev.cancelable) ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    }, { capture: true, passive: false });
  });
  ['touchstart','touchmove','touchend','touchcancel'].forEach(type => {
    canvas.addEventListener(type, ev => {
      if (ev.cancelable) ev.preventDefault();
      ev.stopImmediatePropagation();
    }, { capture: true, passive: false });
  });

  // Keyboard stays vertical-only; the compact forward/back dodge is a thumb-pad feature.
  function blockHorizontalKeys(ev) {
    const k = ev.key.toLowerCase();
    if (k === 'arrowleft' || k === 'arrowright' || k === 'a' || k === 'd') {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  }
  canvas.addEventListener('keydown', blockHorizontalKeys, true);
  canvas.addEventListener('keyup', blockHorizontalKeys, true);

  function beginPad(clientX, clientY, id = POINTER_ID) {
    if (active) return;
    active = true;
    controlId = id;
    startClientX = clientX;
    startClientY = clientY;
    startShipX = estimateX;
    startShipY = estimateY;
    pad.classList.add('active');
    syntheticPointer('pointerdown', estimateX, estimateY, 1);
  }

  function movePad(clientX, clientY) {
    if (!active) return;
    const scale = canvasScale();
    const dx = (clientX - startClientX) * scale.x * X_SENSITIVITY;
    const dy = (clientY - startClientY) * scale.y * Y_SENSITIVITY;
    estimateX = clamp(startShipX + dx, MIN_X, MAX_X);
    estimateY = clamp(startShipY + dy, MIN_Y, MAX_Y);
    syntheticPointer('pointermove', estimateX, estimateY, 1);
  }

  function finishPad() {
    if (!active) return;
    syntheticPointer('pointerup', estimateX, estimateY, 0);
    active = false;
    controlId = null;
    pad.classList.remove('active');
  }

  if (typeof PointerEvent === 'function') {
    pad.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      beginPad(ev.clientX, ev.clientY, ev.pointerId);
      try { pad.setPointerCapture(ev.pointerId); } catch (_) {}
    }, { passive: false });
    pad.addEventListener('pointermove', ev => {
      if (!active || ev.pointerId !== controlId) return;
      ev.preventDefault();
      movePad(ev.clientX, ev.clientY);
    }, { passive: false });
    pad.addEventListener('pointerup', ev => {
      if (ev.pointerId !== controlId) return;
      ev.preventDefault();
      finishPad();
    }, { passive: false });
    pad.addEventListener('pointercancel', ev => { if (ev.pointerId === controlId) finishPad(); }, { passive: false });
  } else {
    let touchId = null;
    pad.addEventListener('touchstart', ev => {
      if (active || !ev.changedTouches.length) return;
      const t = ev.changedTouches[0];
      touchId = t.identifier;
      ev.preventDefault();
      beginPad(t.clientX, t.clientY, touchId);
    }, { passive: false });
    pad.addEventListener('touchmove', ev => {
      if (!active) return;
      for (const t of ev.touches) if (t.identifier === touchId) {
        ev.preventDefault();
        movePad(t.clientX, t.clientY);
        break;
      }
    }, { passive: false });
    const finishTouch = ev => {
      for (const t of ev.changedTouches) if (t.identifier === touchId) {
        ev.preventDefault();
        touchId = null;
        finishPad();
        break;
      }
    };
    pad.addEventListener('touchend', finishTouch, { passive: false });
    pad.addEventListener('touchcancel', finishTouch, { passive: false });
    pad.addEventListener('mousedown', ev => { ev.preventDefault(); beginPad(ev.clientX, ev.clientY, 1); });
    window.addEventListener('mousemove', ev => { if (active) movePad(ev.clientX, ev.clientY); });
    window.addEventListener('mouseup', finishPad);
  }

  function resetControl() {
    finishPad();
    estimateX = 150;
    estimateY = H / 2;
    startShipX = estimateX;
    startShipY = estimateY;
  }

  startBtn?.addEventListener('click', resetControl);
  routeChoice?.addEventListener('click', resetControl);
})();
