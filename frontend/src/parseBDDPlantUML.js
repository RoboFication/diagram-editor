// parseBDDPlantUML.js
import * as joint from 'jointjs';
import { createCustomBlock, createUmlLink } from './bddShapes';

const commentRegex = /^'/;
const classLineRegex = /^class\s+("?[\w\d_]+"?)\s+<<(\w+)>>\s*(\{)?/i;

// Relationship line example:
// Bike "1" *-- "1" Car : composition
// Car "*" o-- "1" House : aggregation
// We define a regex with optional cardinalities in quotes, arrow [*o]?--\|> and optional label after colon
const relRegex = new RegExp([
  '^',
  '(\\S+)',                      // (1) sourceName
  '\\s*(?:"([^"]*)")?\\s*',      // (2) optional sourceCard in quotes
  '([*o]?--(?:\\|>)?)',          // (3) arrow: optional * or o, then --, then optionally |>
  '\\s*(?:"([^"]*)")?\\s*',      // (4) optional targetCard in quotes
  '(\\S+)',                      // (5) targetName
  '\\s*(?::\\s*(.+))?',          // (6) optional label after colon
  '$'
].join(''));

export function parseBDDPlantUML(umlText) {
  console.log('=== parseBDDPlantUML DEBUG ===');
  console.log('UML input:\n', umlText);

  let lines = umlText
    .replace(/@startuml/g, '')
    .replace(/@enduml/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const nodes = [];
  const links = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    console.log(`Line[${i}]: "${line}"`);

    // skip comments
    if (commentRegex.test(line)) {
      console.log(' -> This line is a comment, skipping');
      i++;
      continue;
    }

    // 1) Class line
    let mc = line.match(classLineRegex);
    if (mc) {
      console.log(' -> Matched CLASS line =>', mc);
      const rawName = mc[1].replace(/"/g, '');
      const stereo = mc[2].toLowerCase();
      let hasOpenBrace = !!mc[3];
      let attributes = [];

      i++;
      if (hasOpenBrace) {
        while (i < lines.length && !lines[i].startsWith('}')) {
          if (!commentRegex.test(lines[i]) && lines[i]) {
            attributes.push(lines[i]);
          }
          i++;
        }
        if (i < lines.length && lines[i].startsWith('}')) {
          i++;
        }
      }

      console.log(` -> Creating node: name="${rawName}", stereo="${stereo}", attrs=`, attributes);

      nodes.push({
        name: rawName,
        stereotype: stereo,
        attributes
      });
      continue;
    }

    // 2) Relationship line
    let mr = line.match(relRegex);
    if (mr) {
      console.log(' -> Matched REL line =>', mr);
      const sourceName = mr[1];
      const sourceCard = mr[2] || '';
      const arrow = mr[3];  // e.g. "*--", "o--", "--|>", or "--"
      const targetCard = mr[4] || '';
      const targetName = mr[5];
      const userLabel = mr[6] || ''; // after colon

      // interpret linkType
      let linkType = 'association';
      if (arrow.includes('*--')) linkType = 'composition';
      else if (arrow.includes('o--')) linkType = 'aggregation';
      else if (arrow.includes('--|>')) linkType = 'generalization';

      console.log(
        ` -> Relationship parsed => source="${sourceName}" [${sourceCard}], arrow="${arrow}", target="${targetName}" [${targetCard}], label="${userLabel}", linkType="${linkType}"`
      );

      links.push({
        sourceName,
        sourceCard,
        targetName,
        targetCard,
        linkType,
        userLabel
      });

      i++;
      continue;
    }

    // If we get here, it didn't match class or rel
    console.log(' -> No match (ignoring line)');
    i++;
  }

  console.log('=== parseBDDPlantUML results ===');
  console.log('Nodes:', nodes);
  console.log('Links:', links);

  return { nodes, links };
}

export function buildJointJSFromBDD(umlText, graph) {
  console.log('=== buildJointJSFromBDD DEBUG ===');
  const { nodes, links } = parseBDDPlantUML(umlText);

  graph.clear();

  console.log(' -> Creating shapes for nodes...');
  const nodeMap = {};

  // create shapes
  nodes.forEach((n, idx) => {
    console.log(`  Node[${idx}]:`, n);
    const labelLines = [n.name, `<<${n.stereotype}>>`, ...n.attributes];
    const labelText = labelLines.join('\n');

    let shape;
    if (n.stereotype === 'block') {
      shape = createCustomBlock(labelText);
    } else {
      shape = new joint.shapes.standard.Rectangle();
      shape.resize(180, 90);
      shape.attr({
        label: { text: labelText, fill: 'black' },
        body: { fill: '#fff', magnet: true }
      });
    }
    shape.position(Math.random() * 200, Math.random() * 200);

    nodeMap[n.name] = shape;
    graph.addCell(shape);
  });

  console.log(' -> nodeMap keys =', Object.keys(nodeMap));

  // create links
  console.log(' -> Creating links for relationships...');
  links.forEach((l, idx) => {
    console.log(`  Link[${idx}]:`, l);
    const src = nodeMap[l.sourceName];
    const tgt = nodeMap[l.targetName];
    if (!src) {
      console.log(`   -> SKIPPING link, source nodeMap["${l.sourceName}"] is missing`);
      return;
    }
    if (!tgt) {
      console.log(`   -> SKIPPING link, target nodeMap["${l.targetName}"] is missing`);
      return;
    }

    const link = createUmlLink(l.linkType);

    // label(0) => user label
    link.label(0, { attrs: { text: { text: l.userLabel } } });
    // label(1) => sourceCard
    link.label(1, { attrs: { text: { text: l.sourceCard } } });
    // label(2) => targetCard
    link.label(2, { attrs: { text: { text: l.targetCard } } });

    link.source(src);
    link.target(tgt);
    console.log(`   -> Created link from "${l.sourceName}" to "${l.targetName}" with type="${l.linkType}"`);
    graph.addCell(link);
  });

  console.log('=== Done building JointJS graph ===');
}
