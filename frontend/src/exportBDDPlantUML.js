// exportBDDPlantUML.js
import * as joint from 'jointjs';

export function exportBDDPlantUML(graph) {
  let uml = '@startuml\n';

  // 1) Elements => "class "Vehicle" <<block>> { +weight: float }"
  const elements = graph.getElements();
  elements.forEach((el, idx) => {
    const lbl = el.attr('label/text') || '';
    const lines = lbl.split('\n').map(t => t.trim()).filter(Boolean);

    const className = lines[0] || `Block${idx}`;
    let stereo = 'block';
    let attributes = [];

    // if second line is "<<block>>"
    if (lines[1] && lines[1].startsWith('<<') && lines[1].endsWith('>>')) {
      stereo = lines[1].replace(/[<>\s]/g, '');
      attributes = lines.slice(2);
    } else {
      attributes = lines.slice(1);
    }

    uml += `class "${className}" <<${stereo}>> {\n`;
    // Just output the attributes as typed (no extra plus sign)
    attributes.forEach(attrLine => {
      uml += `  ${attrLine}\n`;
    });
    uml += `}\n`;
  });

  // 2) Links => e.g. Car "1" *-- "1..*" Engine : composed of
  const links = graph.getLinks();
  links.forEach((lk) => {
    const sEl = lk.getSourceElement();
    const tEl = lk.getTargetElement();
    if (!sEl || !tEl) return;

    // read their names from the first line of label
    const sLines = (sEl.attr('label/text') || '').split('\n');
    const tLines = (tEl.attr('label/text') || '').split('\n');
    const sourceName = sLines[0] || 'Source';
    const targetName = tLines[0] || 'Target';

    // label(0) => user label
    let label0 = lk.label(0);
    let userLabel = (label0 && label0.attrs?.text?.text) ? label0.attrs.text.text.trim() : '';

    // label(1) => source card
    let label1 = lk.label(1);
    let sourceCard = (label1 && label1.attrs?.text?.text) ? label1.attrs.text.text.trim() : '';

    // label(2) => target card
    let label2 = lk.label(2);
    let targetCard = (label2 && label2.attrs?.text?.text) ? label2.attrs.text.text.trim() : '';

    // detect link type from markers or from user label
    // simpler approach: check the black diamond / white diamond / triangle in link.attr
    // or guess from userLabel
    // For brevity here, let's do a quick guess from the marker:

    const lineAttr = lk.attr('line') || {};
    let linkType = 'association';

    // composition => black diamond on source
    if (lineAttr.sourceMarker && lineAttr.sourceMarker.fill === 'black') {
      linkType = 'composition';
    }
    // aggregation => white diamond on source
    else if (lineAttr.sourceMarker && lineAttr.sourceMarker.fill === 'white') {
      linkType = 'aggregation';
    }
    // generalization => triangle on target
    else if (lineAttr.targetMarker && lineAttr.targetMarker.d?.includes('M 10 -6')) {
      linkType = 'generalization';
    }

    // Convert linkType => arrow syntax
    let arrow = '--';
    if (linkType === 'composition') arrow = '*--';
    if (linkType === 'aggregation') arrow = 'o--';
    if (linkType === 'generalization') arrow = '--|>';

    // If cardinalities are set, we wrap them in quotes
    let srcCardStr = sourceCard ? `"${sourceCard}" ` : '';
    let tgtCardStr = targetCard ? `"${targetCard}" ` : '';

    // e.g. Car "1" *-- "4" Engine : composed of
    uml += `${sourceName} ${srcCardStr}${arrow} ${tgtCardStr}${targetName}`;
    if (userLabel) {
      uml += ` : ${userLabel}`;
    }
    uml += `\n`;
  });

  uml += '@enduml';
  return uml;
}
