// initGraphs.js
import * as joint from 'jointjs';
import { createUmlLink, createCustomBlock } from './bddShapes';
import { initializeZoomPan } from './zoomPan';

/**
 * Initializes the main Paper, the stencil Paper, and sets up:
 *  - Zoom/pan
 *  - Resizable block
 *  - 4 link types in stencil
 *  - Double-click on block => multiline edit
 *  - Double-click on link => single prompt to edit center, sourceCard, targetCard
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

    validateMagnet: (cellView, magnet) => {
      return magnet && magnet.getAttribute('magnet') === 'true';
    },
    validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet) => {
      if (!targetView || !targetMagnet) return false;
      return targetMagnet.getAttribute('magnet') === 'true';
    }
  });
  // Zoom/pan
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

  // a) Custom block
  const customBlock = createCustomBlock();
  customBlock.position(20, 20);
  stencilGraph.addCell(customBlock);

  // b) Four link types
  const compLink = createUmlLink('composition');
  compLink.source({ x: 20, y: 150 });
  compLink.target({ x: 180, y: 150 });
  stencilGraph.addCell(compLink);

  const aggLink = createUmlLink('aggregation');
  aggLink.source({ x: 20, y: 200 });
  aggLink.target({ x: 180, y: 200 });
  stencilGraph.addCell(aggLink);

  const genLink = createUmlLink('generalization');
  genLink.source({ x: 20, y: 250 });
  genLink.target({ x: 180, y: 250 });
  stencilGraph.addCell(genLink);

  const assocLink = createUmlLink('association');
  assocLink.source({ x: 20, y: 300 });
  assocLink.target({ x: 180, y: 300 });
  stencilGraph.addCell(assocLink);

  // 6) Drag-and-drop from stencil => main paper
  let currentElement = null;

  stencilPaper.on('cell:pointerdown', (cellView) => {
    currentElement = cellView.model.clone();
    // make it interactive once placed on main paper
    currentElement.unset('interactive');
  });

  paperRef.current.addEventListener('mouseup', (evt) => {
    if (!currentElement) return;

    const paperRect = paper.el.getBoundingClientRect();
    const x = evt.clientX - paperRect.left;
    const y = evt.clientY - paperRect.top;

    if (currentElement.isLink()) {
      // optional auto-connect
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
      currentElement.position(x, y);
      mainGraph.addCell(currentElement);
    }
    currentElement = null;
  });

  // 7) Double-click element => multiline editor
  paper.on('element:pointerdblclick', (elementView) => {
    if (onElementDblClick) {
      onElementDblClick(elementView.model);
    }
  });

  // 8) Single-click block => boundary box + remove
  paper.on('element:pointerclick', (elementView) => {
    const tools = new joint.dia.ToolsView({
      tools: [
        new joint.elementTools.Boundary({ padding: 5 }),
        new joint.elementTools.Remove({ offset: 20, distance: 30 })
      ]
    });
    elementView.addTools(tools);
  });

  paper.on('element:mouseleave', (elementView) => {
    elementView.removeTools();
  });

  // 9) Single-click link => arrowheads, remove, etc.
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

  // 10) Double-click on the link => single prompt for center, sourceCard, targetCard
  paper.on('cell:pointerdblclick', (cellView, evt) => {
    // if it's an element, we already handled above. So let's check if it's a link
    const model = cellView.model;
    if (model.isLink()) {
      // read existing label values
      const lbl0 = model.label(0)?.attrs?.text?.text || '';
      const lbl1 = model.label(1)?.attrs?.text?.text || '';
      const lbl2 = model.label(2)?.attrs?.text?.text || '';
      const oldVal = `${lbl0};${lbl1};${lbl2}`;

      const promptStr =
        'Edit link labels (semicolon separated):\n' +
        'center; sourceCard; targetCard';

      const newVal = prompt(promptStr, oldVal);
      if (newVal !== null) {
        const parts = newVal.split(';');
        const newLbl0 = (parts[0] || '').trim();
        const newLbl1 = (parts[1] || '').trim();
        const newLbl2 = (parts[2] || '').trim();
        model.label(0, { attrs: { text: { text: newLbl0 } } });
        model.label(1, { attrs: { text: { text: newLbl1 } } });
        model.label(2, { attrs: { text: { text: newLbl2 } } });
      }
    }
  });

  // 11) Resizing by circle handle
  let resizingData = null;

  paper.on('element:pointerdown', (elementView, evt, x, y) => {
    const target = evt.target;
    if (!target) return;

    const selector = target.getAttribute('joint-selector') || '';
    if (selector === 'resizeHandle') {
      evt.stopPropagation();
      evt.preventDefault();

      const model = elementView.model;
      const initialSize = model.size();
      const local = paper.clientToLocalPoint({ x: evt.clientX, y: evt.clientY });

      resizingData = {
        model,
        initialSize,
        startX: local.x,
        startY: local.y
      };

      const onMove = (evt2) => {
        const p = paper.clientToLocalPoint({ x: evt2.clientX, y: evt2.clientY });
        const dx = p.x - resizingData.startX;
        const dy = p.y - resizingData.startY;

        let newW = resizingData.initialSize.width + dx;
        let newH = resizingData.initialSize.height + dy;
        newW = Math.max(20, newW);
        newH = Math.max(20, newH);

        resizingData.model.resize(newW, newH);
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
