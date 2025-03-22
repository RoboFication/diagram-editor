// bddShapes.js
import * as joint from 'jointjs';

/**
 * Creates a SysML/Block-like rectangular shape
 * that can have lines like "+speed: float" in the text.
 */
export function createCustomBlock(initialLabel = 'Block\n<<block>>\nattr:Type') {
  return new joint.dia.Element({
    type: 'myapp.CustomBlock',
    size: { width: 160, height: 80 },
    attrs: {
      body: {
        fill: '#FFFFFF',
        stroke: '#000000',
        strokeWidth: 1,
        magnet: true,
        refWidth: '100%',
        refHeight: '100%'
      },
      label: {
        text: initialLabel,
        fill: 'black',
        refX: '50%',
        refY: '50%',
        textAnchor: 'middle',
        yAlignment: 'middle'
      },
      // The manual resize circle
      resizeHandle: {
        ref: 'body',
        refX: '0%',
        refY: '0%',
        refDx: 0,
        refDy: 0,
        r: 4,
        fill: '#333333',
        cursor: 'se-resize'
      }
    },
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'text', selector: 'label' },
      { tagName: 'circle', selector: 'resizeHandle' }
    ]
  });
}

/**
 * Creates a dynamic UML link with 3 labels:
 *   - label(0) = center text (e.g. "composed of" / "association" / etc.)
 *   - label(1) = source cardinality
 *   - label(2) = target cardinality
 *
 * `linkType` sets the arrow marker:
 *   "composition" => black diamond on source
 *   "aggregation" => white diamond on source
 *   "generalization" => triangle arrow on target
 *   "association" => no special arrow
 */
export function createUmlLink(linkType = 'association') {
  const link = new joint.shapes.standard.Link();

  // Common line style
  link.attr({
    line: {
      stroke: '#333',
      // pointerEvents: 'none' => not strictly needed here since we will do 
      // a single double-click on the link approach. But you can set to 'none'
      // if you want the line to pass pointer events through.
    }
  });

  // Markers depending on link type
  switch (linkType) {
    case 'composition':
      link.attr({
        line: {
          sourceMarker: {
            type: 'path',
            d: 'M 10 0 0 -6 -10 0 0 6 z', // filled diamond
            fill: 'black'
          }
        }
      });
      break;
    case 'aggregation':
      link.attr({
        line: {
          sourceMarker: {
            type: 'path',
            d: 'M 10 0 0 -6 -10 0 0 6 z', // diamond
            fill: 'white'
          }
        }
      });
      break;
    case 'generalization':
      link.attr({
        line: {
          targetMarker: {
            type: 'path',
            d: 'M 10 -6 0 0 10 6 z', // triangle
            fill: 'black'
          }
        }
      });
      break;
    default:
      // association => no special marker
      break;
  }

  // label(0) => center text
  link.appendLabel({
    position: 0.5,
    attrs: {
      text: { text: linkType, fill: 'black' },
      body: { pointerEvents: 'none' }
    }
  });

  // label(1) => source cardinality
  link.appendLabel({
    position: 0.2,
    attrs: {
      text: { text: ' ' },
      body: { pointerEvents: 'none' }
    }
  });

  // label(2) => target cardinality
  link.appendLabel({
    position: 0.8,
    attrs: {
      text: { text: ' ' },
      body: { pointerEvents: 'none' }
    }
  });

  return link;
}
