// parseBDDPlantUML.js
import * as joint from "jointjs";
import { createCustomBlock } from "./bddShapes";

const commentRegex = /^'/;
const classLineRegex = /^class\s+("?[\w\d_]+"?)\s+<<(\w+)>>\s*(\{)?/i;
const relRegex = /^(\S+)\s+([\-o\*]+)\s+(\S+)\s*:\s*<<(\w+)>>/i;

export function parseBDDPlantUML(umlText) {
  let lines = umlText
    .replace(/@startuml/g, "")
    .replace(/@enduml/g, "")
    .split("\n")
    .map((l) => l.trim());

  const nodes = [];
  const links = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line) {
      i++;
      continue;
    }
    if (commentRegex.test(line)) {
      i++;
      continue;
    }

    let mc = line.match(classLineRegex);
    if (mc) {
      const rawName = mc[1].replace(/"/g, "");
      const stereo = mc[2];
      const hasOpenBrace = !!mc[3];
      let attributes = [];

      i++;
      if (hasOpenBrace) {
        while (i < lines.length && !lines[i].startsWith("}")) {
          if (lines[i] && !commentRegex.test(lines[i])) {
            attributes.push(lines[i]);
          }
          i++;
        }
        if (i < lines.length && lines[i].startsWith("}")) {
          i++;
        }
      }

      nodes.push({
        name: rawName,
        stereotype: stereo.toLowerCase(),
        attributes,
      });
      continue;
    }

    let mr = line.match(relRegex);
    if (mr) {
      const source = mr[1];
      const arrow = mr[2];
      const target = mr[3];
      let labelStereo = mr[4].toLowerCase();

      // unify composition vs. association
      let relStereotype =
        arrow.includes("*") || labelStereo.includes("compos")
          ? "composition"
          : "association";

      links.push({ source, target, arrow, relStereotype });
      i++;
      continue;
    }

    i++;
  }

  return { nodes, links };
}

export function buildJointJSFromBDD(umlText, graph) {
  const { nodes, links } = parseBDDPlantUML(umlText);
  graph.clear();

  const nodeMap = {};

  nodes.forEach((n) => {
    // Build the text lines for the shape label
    // e.g. ["Car", "<<block>>", "horsepower=100", "color=red"]
    const labelLines = [n.name, `<<${n.stereotype}>>`, ...n.attributes];
    const labelText = labelLines.join("\n");

    let element;

    if (n.stereotype === "block") {
      // CREATE A CUSTOM BLOCK (with the circle handle)
      element = createCustomBlock(labelText);
    } else {
      // For any other stereotype, create a basic standard rectangle
      element = new joint.shapes.standard.Rectangle();
      element.resize(180, 90);
      element.attr({
        label: { text: labelText, fill: "black" },
        body: { fill: "#FFFFFF", magnet: true },
      });
    }

    // Random position so they don’t all overlap
    element.position(Math.random() * 200, Math.random() * 200);
    graph.addCell(element);
    nodeMap[n.name] = element;
  });

  links.forEach((l) => {
    const src = nodeMap[l.source];
    const tgt = nodeMap[l.target];
    if (!src || !tgt) return;

    const link = new joint.shapes.standard.Link();
    if (l.relStereotype === "composition") {
      link.attr({
        line: {
          sourceMarker: {
            type: "path",
            d: "M 10 0 0 -6 -10 0 0 6 z",
            fill: "black",
          },
        },
      });
    }
    link.source(src);
    link.target(tgt);

    link.appendLabel({
      position: 0.5,
      attrs: {
        text: { text: `<<${l.relStereotype}>>` },
      },
    });

    graph.addCell(link);
  });
}
