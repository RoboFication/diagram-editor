// initGraphs.js
import * as joint from 'jointjs';
import { createCompositionLink, createAssociationLink, createCustomBlock } from './bddShapes';
import { initializeZoomPan } from './zoomPan';
/**
 * Initializes the main Paper, the stencil Paper, and sets up all interactions,
 * including manual resizing via a custom "handle" circle in the block shape.
 */
export function initializeGraphs({
  stencilRef,
  paperRef,
  setGraph,
  setMainPaper,
  setStencilGraph,
  onElementDblClick
}) {
  // 1) Main Graph
  const mainGraph = new joint.dia.Graph();
  setGraph(mainGraph);

  // 2) Paper
  const paper = new joint.dia.Paper({
    el: paperRef.current,
    model: mainGraph,
    width: 1000,
    height: 600,
    gridSize: 10,
    drawGrid: true,

    interactive: {
      elementMove: true,
      linkMove: {
        arrowheadMove: true,
        labelMove: false,
        vertexAdd: false
      }
    },

    // Only connect link endpoints to shapes with magnet="true"
    validateMagnet: (cellView, magnet) => {
      return magnet && magnet.getAttribute('magnet') === 'true';
    },
    // If user tries to connect to blank or a shape with no magnet => false
    validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet) => {
      if (!targetView || !targetMagnet) return false;
      if (targetMagnet.getAttribute('magnet') !== 'true') return false;
      return true;
    }
  });
  initializeZoomPan({
    paper,
    container: paperRef.current,
    zoomStep: 0.2,
    minZoom: 0.2,
    maxZoom: 3.0
  });
  setMainPaper(paper);

  // 3) Stencil Graph
  const stencilGraph = new joint.dia.Graph();
  setStencilGraph(stencilGraph);

  // 4) Stencil Paper
  const stencilPaper = new joint.dia.Paper({
    el: stencilRef.current,
    model: stencilGraph,
    width: 200,
    height: 600,
    interactive: false
  });

  // 5) Populate the stencil
  // (a) Our custom block with a built-in resize handle
  const customBlock = createCustomBlock();
  customBlock.position(20, 20);
  stencilGraph.addCell(customBlock);

  // (b) Composition link
  const compLink = createCompositionLink();
  compLink.source({ x: 40, y: 150 });
  compLink.target({ x: 160, y: 150 });
  stencilGraph.addCell(compLink);

  // (c) Association link
  const assocLink = createAssociationLink();
  assocLink.source({ x: 40, y: 250 });
  assocLink.target({ x: 160, y: 250 });
  stencilGraph.addCell(assocLink);

  // 6) Drag-and-drop from stencil => main paper
  let currentElement = null;

  stencilPaper.on('cell:pointerdown', (cellView) => {
    currentElement = cellView.model.clone();
    // Make sure it's interactive once placed in main paper
    currentElement.unset('interactive');
  });

  paperRef.current.addEventListener('mouseup', (evt) => {
    if (!currentElement) return;

    const paperRect = paper.el.getBoundingClientRect();
    const x = evt.clientX - paperRect.left;
    const y = evt.clientY - paperRect.top;

    if (currentElement.isLink()) {
      // Optional: auto-connect if there's a shape under pointer
      const localPoint = paper.clientToLocalPoint({ x: evt.clientX, y: evt.clientY });
      const targetViews = paper.findViewsFromPoint(localPoint);
      if (targetViews.length) {
        currentElement.source(targetViews[0].model, { magnet: 'body' });
        currentElement.target({ x: x + 100, y });
      } else {
        currentElement.source({ x, y });
        currentElement.target({ x: x + 100, y });
      }
      mainGraph.addCell(currentElement);
    } else {
      // It's a custom block
      currentElement.position(x, y);
      mainGraph.addCell(currentElement);
    }

    currentElement = null;
  });

  // 7) Double-click => open multiline editor
  paper.on('element:pointerdblclick', (elementView) => {
    if (onElementDblClick) {
      onElementDblClick(elementView.model);
    }
  });

  // 8) Single-click an element => boundary box + remove button
  paper.on('element:pointerclick', (elementView) => {
    const tools = new joint.dia.ToolsView({
      tools: [
        new joint.elementTools.Boundary({ padding: 5 }),
        new joint.elementTools.Remove({
          offset: 20,
          distance: 30
        })
      ]
    });
    elementView.addTools(tools);
  });

  paper.on('element:mouseleave', (elementView) => {
    // Hide the boundary/remove tools upon exit
    elementView.removeTools();
  });

  // 9) link:pointerclick => arrowheads + remove, etc.
  paper.on('link:pointerclick', (linkView) => {
    const tools = new joint.dia.ToolsView({
      tools: [
        new joint.linkTools.Vertices(),
        new joint.linkTools.SourceArrowhead(),
        new joint.linkTools.TargetArrowhead(),
        new joint.linkTools.Remove({ distance: 20 })
      ]
    });
    linkView.addTools(tools);
  });

  // 10) Manual "resize handle" approach using document-level events
  let resizingData = null;

  paper.on('element:pointerdown', (elementView, evt, x, y) => {
    // Check if the user clicked the circle with selector="resizeHandle"
    const target = evt.target;
    if (!target) return;

    // JointJS adds a "joint-selector" attribute with the selector name:
    const selector = target.getAttribute('joint-selector') || '';
    if (selector === 'resizeHandle') {
      // Stop normal "move the element" behavior
      evt.stopPropagation();
      evt.preventDefault();

      const model = elementView.model;
      const initialSize = model.size();
      // We want the original pointer location in local coordinates
      const local = paper.clientToLocalPoint({ x: evt.clientX, y: evt.clientY });

      resizingData = {
        model,
        initialSize,
        startX: local.x,
        startY: local.y
      };

      // Attach doc-level mousemove + mouseup
      const onMove = (evt2) => {
        const p = paper.clientToLocalPoint({ x: evt2.clientX, y: evt2.clientY });
        const dx = p.x - resizingData.startX;
        const dy = p.y - resizingData.startY;

        let newWidth = resizingData.initialSize.width + dx;
        let newHeight = resizingData.initialSize.height + dy;

        // clamp
        newWidth = Math.max(20, newWidth);
        newHeight = Math.max(20, newHeight);

        resizingData.model.resize(newWidth, newHeight);
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        resizingData = null;
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
  });

  return { mainGraph, paper, stencilGraph, stencilPaper };
}