(() => {
  'use strict';

  function startPixelCursor() {
    if (document.querySelector('.yw-pixel-cursor')) return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const trail = document.createElement('div');
    trail.className = 'yw-pixel-cursor';
    trail.setAttribute('aria-hidden', 'true');
    trail.setAttribute('inert', '');
    trail.hidden = true;

    const particles = Array.from({ length: 18 }, (_, index) => {
      const node = document.createElement('span');
      trail.append(node);
      return { node, x: 0, y: 0, phase: index * 1.71 };
    });
    document.body.append(trail);

    const HOLD_MS = 100;
    const FADE_MS = 260;
    const RESTART_MS = HOLD_MS + FADE_MS;
    let frame = 0;
    let lastFrame = 0;
    let lastMove = 0;
    let initialized = false;
    let pointerX = 0;
    let pointerY = 0;
    let speed = 0;

    function allowed() {
      return finePointer.matches && !reducedMotion.matches && !document.hidden;
    }

    function isEditable(target) {
      return target instanceof Element && (
        target.isContentEditable ||
        Boolean(target.closest('input, textarea, select, [role="textbox"]'))
      );
    }

    function hide() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
      initialized = false;
      trail.hidden = true;
      trail.style.opacity = '0';
    }

    function place(particle, x, y) {
      // clientX/clientY are viewport-local, including inside a preview iframe.
      particle.node.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    }

    function animate(now) {
      frame = 0;
      const idleFor = now - lastMove;
      if (!allowed() || idleFor >= RESTART_MS) {
        hide();
        return;
      }

      const delta = lastFrame ? Math.min(now - lastFrame, 40) : 16.67;
      lastFrame = now;
      const fade = Math.max(0, 1 - Math.max(0, idleFor - HOLD_MS) / FADE_MS);
      const follow = 1 - Math.exp(-delta / 31);
      const wobble = Math.min(speed / 32, 1) * fade;

      particles.forEach((particle, index) => {
        const leader = index ? particles[index - 1] : { x: pointerX + 6, y: pointerY + 7 };
        particle.x += (leader.x - particle.x) * follow;
        particle.y += (leader.y - particle.y) * follow;
        const spread = index / (particles.length - 1);
        const offsetX = Math.sin(now / 83 + particle.phase) * 3 * spread * wobble;
        const offsetY = Math.cos(now / 101 + particle.phase) * 3 * spread * wobble;
        place(particle, particle.x + offsetX, particle.y + offsetY);
      });

      trail.style.opacity = String(fade);
      frame = window.requestAnimationFrame(animate);
    }

    function move(event) {
      // A touch on a hybrid device must not activate its mouse decoration.
      if (!allowed() || event.pointerType === 'touch' || isEditable(event.target)) {
        hide();
        return;
      }

      const now = performance.now();
      const distance = Math.hypot(event.clientX - pointerX, event.clientY - pointerY);
      if (initialized && distance < .5) return;
      const restart = !initialized || now - lastMove >= RESTART_MS || distance > 400;
      pointerX = event.clientX;
      pointerY = event.clientY;
      speed = restart ? 0 : distance;
      lastMove = now;

      if (restart) {
        // Position every square before revealing the layer, avoiding a (0, 0) flash.
        particles.forEach(particle => {
          particle.x = pointerX + 6;
          particle.y = pointerY + 7;
          place(particle, particle.x, particle.y);
        });
        lastFrame = 0;
        initialized = true;
      }

      trail.hidden = false;
      if (!frame) frame = window.requestAnimationFrame(animate);
    }

    const passive = { passive: true };
    document.addEventListener('pointermove', move, passive);
    document.addEventListener('pointerleave', hide, passive);
    document.addEventListener('pointerout', event => {
      if (!event.relatedTarget) hide();
    }, passive);
    document.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' || isEditable(event.target)) hide();
    }, passive);
    document.addEventListener('focusin', event => {
      if (isEditable(event.target)) hide();
    }, passive);
    document.addEventListener('visibilitychange', hide, passive);
    window.addEventListener('blur', hide, passive);
    window.addEventListener('pagehide', hide, passive);

    [finePointer, reducedMotion].forEach(query => {
      if (query.addEventListener) query.addEventListener('change', hide, passive);
      else query.addListener(hide);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPixelCursor, { once: true, passive: true });
  } else startPixelCursor();
})();
