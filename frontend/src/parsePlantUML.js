// parsePlantUML.js
import * as joint from 'jointjs';

export function parsePlantUML(umlText) {
  let lines = umlText
    .replace(/@startuml/g, '')
    .replace(/@enduml/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l);

  const nodes = [];
  const links = [];

  const rectRegex = /^rectangle\s+"([^"]+)"\s+as\s+(\S+)$/i;
  const linkRegex = /^(\S+)\s*-->\s*(\S+)$/;

  for (const line of lines) {
    let mr = line.match(rectRegex);
    if (mr) {
      nodes.push({ label: mr[1], id: mr[2] });
      continue;
    }
    let ml = line.match(linkRegex);
    if (ml) {
      links.push({ source: ml[1], target: ml[2] });
      continue;
    }
  }
  return { nodes, links };
}

export function buildJointJSFromPlantUML(umlText, graph) {
  const { nodes, links } = parsePlantUML(umlText);
  graph.clear();

  const idMap = {};
  nodes.forEach(n => {
    const rect = new joint.shapes.standard.Rectangle();
    rect.resize(100, 40);
    rect.position(Math.random() * 200, Math.random() * 200);
    rect.attr({
      body: { fill: '#fff', magnet: true },
      label: { text: n.label || n.id, fill: 'black' }
    });
    graph.addCell(rect);
    idMap[n.id] = rect;
  });

  links.forEach(l => {
    const s = idMap[l.source];
    const t = idMap[l.target];
    if (s && t) {
      const link = new joint.shapes.standard.Link();
      link.source(s);
      link.target(t);
      link.attr({
        line: { stroke: 'black', 'stroke-dasharray': '5 2' }
      });
      graph.addCell(link);
    }
  });
}
