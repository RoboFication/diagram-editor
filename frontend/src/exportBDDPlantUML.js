// exportBDDPlantUML.js
import * as joint from 'jointjs';

export function exportBDDPlantUML(graph) {
  let uml = '@startuml\n';

  // 1) Elements => PlantUML classes
  const elements = graph.getElements();
  elements.forEach((el, idx) => {
    const label = el.attr('label/text') || '';
    const lines = label.split('\n').map(l => l.trim()).filter(Boolean);
    const className = lines[0] || `Block${idx}`;
    let stereotype = 'block';
    let attributes = [];

    // If second line is "<<something>>"
    if (lines[1] && lines[1].match(/^<<.+>>$/)) {
      stereotype = lines[1].replace(/[<>\s]/g, '');
      attributes = lines.slice(2);
    } else {
      attributes = lines.slice(1);
    }

    uml += `class ${className} <<${stereotype}>> {\n`;
    attributes.forEach(a => {
      uml += `  ${a}\n`;
    });
    uml += `}\n`;
  });

  // 2) Links => PlantUML relationships
  const links = graph.getLinks();
  links.forEach((lk) => {
    const sEl = lk.getSourceElement();
    const tEl = lk.getTargetElement();
    if (!sEl || !tEl) return;

    const sLines = (sEl.attr('label/text') || '').split('\n');
    const tLines = (tEl.attr('label/text') || '').split('\n');
    const sourceName = sLines[0] || 'Src';
    const targetName = tLines[0] || 'Tgt';

    let linkStereo = 'association'; // default
    const labelObj = lk.label(0);
    if (labelObj && labelObj.attrs?.text?.text) {
      const textVal = labelObj.attrs.text.text.toLowerCase(); // e.g. "<<composition>>"
      if (textVal.includes('compos')) linkStereo = 'composition';
      else if (textVal.includes('assoc')) linkStereo = 'association';
    }

    // arrow syntax
    let arrow = '--';
    if (linkStereo === 'composition') {
      arrow = '--*';
    }

    uml += `${sourceName} ${arrow} ${targetName} : <<${linkStereo}>>\n`;
  });

  uml += '@enduml';
  return uml;
}
