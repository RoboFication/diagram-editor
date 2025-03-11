// shapes.js
// The same shape factories you had in the old shapes.js, just as ES modules

import * as joint from 'jointjs';

export function createRectangle() {
  const rect = new joint.shapes.standard.Rectangle();
  rect.resize(100, 40);
  rect.attr({
    body: { fill: '#FFFFFF', magnet: true },
    label: { text: 'Rectangle', fill: 'black' }
  });
  return rect;
}

export function createLink() {
  const link = new joint.shapes.standard.Link();
  link.source({ x: 20, y: 120 });
  link.target({ x: 100, y: 120 });
  link.attr({
    line: { stroke: 'black', 'stroke-dasharray': '5 2' }
  });
  return link;
}
