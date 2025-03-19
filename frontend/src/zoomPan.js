// zoomPan.js
import * as joint from 'jointjs';

/**
 * Initialize zoom + pan for a JointJS Paper.
 *
 * @param {object} options
 * @param {joint.dia.Paper} options.paper  - The JointJS Paper to manipulate
 * @param {HTMLElement}      options.container - The HTML element containing the Paper (paperRef.current)
 * @param {number} [options.zoomStep=0.1]  - How much to zoom per wheel tick
 * @param {number} [options.minZoom=0.5]   - Minimum scaling factor
 * @param {number} [options.maxZoom=2.0]   - Maximum scaling factor
 */
export function initializeZoomPan({ 
  paper, 
  container,
  zoomStep = 0.1,
  minZoom = 0.5,
  maxZoom = 2.0
}) {
  // Current scale factor
  let currentScale = 1.0;

  // Current translate offsets
  let panOffset = { x: 0, y: 0 };

  // Flag + data for panning with the mouse
  let isPanning = false;
  let lastPanPos = { x: 0, y: 0 };

  // 1) Handle mouse wheel => zoom in/out
  container.addEventListener(
    'wheel',
    (evt) => {
      // Prevent the browser’s page scroll
      evt.preventDefault();

      // direction: +1 if user scrolls down, -1 if user scrolls up
      const delta = Math.sign(evt.deltaY);

      if (delta < 0) {
        // Zoom in
        if (currentScale < maxZoom) {
          currentScale += zoomStep;
          if (currentScale > maxZoom) currentScale = maxZoom;
        }
      } else {
        // Zoom out
        if (currentScale > minZoom) {
          currentScale -= zoomStep;
          if (currentScale < minZoom) currentScale = minZoom;
        }
      }

      // Apply scale
      paper.scale(currentScale, currentScale);
    },
    { passive: false }
  );

  // 2) Handle panning by dragging blank area
  paper.on('blank:pointerdown', (event, x, y) => {
    isPanning = true;
    lastPanPos = { x, y };
  });

  paper.on('blank:pointermove', (event, x, y) => {
    if (!isPanning) return;

    // Compute how far we moved since last pointer
    const dx = x - lastPanPos.x;
    const dy = y - lastPanPos.y;
    lastPanPos = { x, y };

    panOffset.x += dx;
    panOffset.y += dy;

    // Apply translation (in addition to scaling)
    paper.translate(panOffset.x, panOffset.y);
  });

  paper.on('blank:pointerup', () => {
    isPanning = false;
  });
}
