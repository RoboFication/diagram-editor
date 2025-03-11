// exportPlantUML.js
import * as joint from 'jointjs';

export function generatePlantUML(graph) {
  let uml = '@startuml\n';

  const nameMap = new Map();
  let idx = 1;

  // For each rectangle => "rectangle A1"
  graph.getElements().forEach(el => {
    const shortName = `A${idx++}`;
    nameMap.set(el.id, shortName);
    uml += `rectangle ${shortName}\n`;
  });

  // For each link => "A1 --> A2"
  graph.getLinks().forEach(link => {
    const sId = link.getSourceElement()?.id;
    const tId = link.getTargetElement()?.id;
    if (sId && tId) {
      uml += `${nameMap.get(sId)} --> ${nameMap.get(tId)}\n`;
    }
  });

  uml += '@enduml';
  return uml;
}
