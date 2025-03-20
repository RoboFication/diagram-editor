// bddShapes.js
import * as joint from "jointjs";

// 1) Block

export function createCustomBlock(initialLabel = "<<block>>\n- attr=val") {
  return new joint.dia.Element({
    type: "myapp.CustomBlock",
    size: { width: 160, height: 80 },
    attrs: {
      body: {
        fill: "#FFFFFF",
        stroke: "#000000",
        strokeWidth: 1,
        magnet: true,
        // Tie the rect to the element's current .size()
        refWidth: "100%",
        refHeight: "100%",
      },
      label: {
        text: initialLabel,
        fill: "black",
        // Center the text
        refX: "50%",
        refY: "50%",
        textAnchor: "middle",
        yAlignment: "middle",
      },
      resizeHandle: {
        // Pin to bottom-right corner of the "body"
        ref: "body",
        refX: "0%",
        refY: "0%",
        // Shift left/up by ~the circle's radius so it appears
        // snugly at that corner
        refDx: 0,
        refDy: 0,
        r: 4,
        fill: "#333333",
        cursor: "se-resize",
      },
    },
    markup: [
      { tagName: "rect", selector: "body" },
      { tagName: "text", selector: "label" },
      { tagName: "circle", selector: "resizeHandle" },
    ],
  });
}

// 2) Composition link
export function createCompositionLink() {
  const link = new joint.shapes.standard.Link();
  // Start out bigger in the stencil (source->target ~80px wide)
  link.source({ x: 20, y: 140 });
  link.target({ x: 200, y: 140 });

  link.attr({
    line: {
      stroke: "#333",
      sourceMarker: {
        type: "path",
        d: "M 10 0 0 -6 -10 0 0 6 z", // diamond
        fill: "black",
      },
    },
  });

  // Fixed label in the middle
  link.appendLabel({
    position: 0.5,
    attrs: {
      text: {
        text: "<<compos>>",
        fill: "black",
        // Prevent label dragging
        pointerEvents: "none",
      },
      body: {
        pointerEvents: "none",
      },
    },
  });
  return link; // type="standard.Link"
}

// 3) Association link
export function createAssociationLink() {
  const link = new joint.shapes.standard.Link();
  link.source({ x: 20, y: 200 });
  link.target({ x: 200, y: 200 });

  link.attr({
    line: {
      stroke: "#333",
    },
  });

  link.appendLabel({
    position: 0.5,
    attrs: {
      text: {
        text: "<<assoc>>",
        fill: "black",
        pointerEvents: "none",
      },
      body: {
        pointerEvents: "none",
      },
    },
  });

  return link;
}
