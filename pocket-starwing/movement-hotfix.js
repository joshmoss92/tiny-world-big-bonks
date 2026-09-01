(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const startBtn = document.getElementById('startBtn');
  const routeChoice = document.getElementById('routeChoice');
  if (!canvas) return;

  const W = canvas.width;
  const H = canvas.height;
  const POINTER_ID = 424242;
  const estimate = { x: 150, y: H / 2 };
  let active = false;
  let touchId = null;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const toCanvas = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    return { x: (clientX - r.left) * W / r.width, y: (clientY - r.top) * H / r.height };
  };
  const toClient = (x, y) => {
    const r = canvas.getBoundingClientRect();
    return { x: r.left + x * r.width / W, y: r.top + y * r.height / H };
  };

  function resetEstimate() {
    estimate.x = 150;
    estimate.y = H / 2;
    active = false;
    touchId = null;
  }

  function syntheticPointer(type, clientX, clientY, buttons = 1) {
    let ev;
    if (typeof PointerEvent === 'function') {
      ev = new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: POINTER_ID, pointerType: 'touch', isPrimary: true, clientX, clientY, buttons });
    } else {
      ev = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(ev, {
        pointerId: { value: POINTER_ID }, pointerType: { value: 'touch' }, isPrimary: { value: true },
        clientX: { value: clientX }, clientY: { value: clientY }, buttons: { value: buttons }
      });
    }
    Object.defineProperty(ev, '__pswFallback', { value: true });
    canvas.dispatchEvent(ev);
  }

  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(type => {
    canvas.addEventListener(type, ev => {
      if (ev.pointerType === 'touch' && !ev.__pswFallback) {
        if (ev.cancelable) ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    }, { capture: true, passive: false });
  });

  canvas.addEventListener('touchstart', ev => {
    if (active || !ev.changedTouches.length) return;
    const t = ev.changedTouches[0];
    const q = toCanvas(t.clientX, t.clientY);
    if (Math.hypot(q.x - estimate.x, q.y - estimate.y) > 185) return;
    if (ev.cancelable) ev.preventDefault();
    active = true;
    touchId = t.identifier;
    const shipClient = toClient(estimate.x, estimate.y);
    syntheticPointer('pointerdown', shipClient.x, shipClient.y, 1);
    syntheticPointer('pointermove', t.clientX, t.clientY, 1);
    estimate.x = clamp(q.x, 35, W - 165);
    estimate.y = clamp(q.y, 46, H - 46);
  }, { passive: false });

  canvas.addEventListener('touchmove', ev => {
    if (!active) return;
    let t = null;
    for (const item of ev.touches) if (item.identifier === touchId) { t = item; break; }
    if (!t) return;
    if (ev.cancelable) ev.preventDefault();
    syntheticPointer('pointermove', t.clientX, t.clientY, 1);
    const q = toCanvas(t.clientX, t.clientY);
    estimate.x = clamp(q.x, 35, W - 165);
    estimate.y = clamp(q.y, 46, H - 46);
  }, { passive: false });

  function finishTouch(ev) {
    if (!active) return;
    for (const item of ev.changedTouches) {
      if (item.identifier === touchId) {
        if (ev.cancelable) ev.preventDefault();
        syntheticPointer('pointerup', item.clientX, item.clientY, 0);
        active = false;
        touchId = null;
        return;
      }
    }
  }

  canvas.addEventListener('touchend', finishTouch, { passive: false });
  canvas.addEventListener('touchcancel', finishTouch, { passive: false });
  startBtn?.addEventListener('click', resetEstimate);
  routeChoice?.addEventListener('click', resetEstimate);
})();
