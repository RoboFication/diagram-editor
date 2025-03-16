import React, { useEffect, useRef, useState } from "react";
import * as joint from "jointjs";
import "../styles/JointJsDemo.css";
import parsePlantUML from "../parsing/parseActivityDiagrams";

export default function JointjsDemo() {
  const FIXED_WIDTH = 700;    // Fixed paper width
  const MIN_HEIGHT = 600;      // Minimum paper height
  const TOP_LEFT_MARGIN = 50;  // Margin from the top-left

  const [umlText, setUmlText] = useState(`@startuml
start
:Load Configurations;
:Load Whisper Model;
stop
@enduml
`);

  // Zoom factor
  const [zoom, setZoom] = useState(1);

  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const paperRef = useRef(null);

  function addInteractivePorts(shape) {
    // 1) Add ports (four sides). We can tweak the sides/IDs as needed.
    shape.addPorts([
      { id: "port-top", group: "top" },
      { id: "port-right", group: "right" },
      { id: "port-bottom", group: "bottom" },
      { id: "port-left", group: "left" },
    ]);
  
    // 2) Define port groups with consistent styling.
    //    `magnet: true` means the user can drag a link from/to these ports.
    //    `opacity: 0` initially hides them until mouse hover.
    shape.prop("ports/groups", {
      top: {
        position: { name: "top" },
        attrs: {
          circle: { r: 6, magnet: true, stroke: "#31d0c6", fill: "#fff", strokeWidth: 2, opacity: 0, },
        },
      },
      right: {
        position: { name: "right" },
        attrs: {
          circle: { r: 6, magnet: true, stroke: "#31d0c6", fill: "#fff", strokeWidth: 2, opacity: 0,},
        },
      },
      bottom: {
        position: { name: "bottom" },
        attrs: {
          circle: { r: 6, magnet: true, stroke: "#31d0c6", fill: "#fff", strokeWidth: 2, opacity: 0,},
        },
      },
      left: {
        position: { name: "left" },
        attrs: {
          circle: { r: 6, magnet: true, stroke: "#31d0c6", fill: "#fff", strokeWidth: 2, opacity: 0,},
        },
      },
    });
  }
  

  // Initialize the main graph/paper once
  useEffect(() => {
    graphRef.current = new joint.dia.Graph();

    paperRef.current = new joint.dia.Paper({
      el: containerRef.current,
      model: graphRef.current,
      width: FIXED_WIDTH,
      height: MIN_HEIGHT,
      gridSize: 10,
      drawGrid: true,
      restrictTranslate: true,
      background: { color: "#ffffff" },

      // Make newly-dragged links match thedashed arrow style
      defaultLink: new joint.shapes.standard.Link({
        attrs: {
          line: { strokeWidth: 2, stroke: "#888", strokeDasharray: "5 5",
            targetMarker: { type: "path", d: "M 10 -5 0 0 10 5 z", fill: "#888",
            },
          },
        },
      }),
      
      // Remove the fancy link tools (the cross and arrow icons on hover)
      interactive: {
        linkMove: false, // Disables the default link editing tools
      },
      linkPinning: false, // Disables the default behaivior where a link can be dragged to an empty area
    });
  }, []);

  // Update paper scale whenever zoom changes
  useEffect(() => {
    if (paperRef.current) {
      paperRef.current.scale(zoom);
    }
  }, [zoom]);

  // Parse & render the diagram each time umlText changes
  useEffect(() => {
    if (!graphRef.current || !paperRef.current) return;

    const { nodes, edges } = parsePlantUML(umlText);

    // Clear any existing diagram
    graphRef.current.clear();

    // Helper for node dimensions
    const nodeDimensions = (node) => {
      if (node.type === "start" || node.type === "stop") {
        return { w: 60, h: 60 };
      } else if (node.type === "diamond") {
        return { w: 100, h: 100 };
      }
      return { w: 160, h: 60 };
    };

    // Find bounding box among all nodes
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((node) => {
      const { x, y } = node.position;
      const { w, h } = nodeDimensions(node);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    });

    // Shift diagram so top-left is at least TOP_LEFT_MARGIN
    const offsetX = minX < TOP_LEFT_MARGIN ? TOP_LEFT_MARGIN - minX : 0;
    const offsetY = minY < TOP_LEFT_MARGIN ? TOP_LEFT_MARGIN - minY : 0;
    if (offsetX || offsetY) {
      nodes.forEach((node) => {
        node.position.x += offsetX;
        node.position.y += offsetY;
      });
      maxX += offsetX;
      maxY += offsetY;
    }

    // Create JointJS elements with correct attribute syntax
    const jointNodesMap = {};
    nodes.forEach((node) => {
      const { x, y } = node.position;
      let shape;

      if (node.type === "start" || node.type === "stop") {
        // Circle shape
        shape = new joint.shapes.standard.Circle();
        shape.resize(60, 60);
        shape.position(x, y);
        shape.attr({
          body: {
            fill: node.type === "start" ? "#1bed88" : "#ff4d4f",
            stroke: "#333",
            strokeWidth: 2
          },
          label: {
            text: node.label,
            fill: "#333",
            fontSize: 14
          }
        });
        addInteractivePorts(shape);
      } else if (node.type === "diamond") {
        // Polygon (diamond) shape
        shape = new joint.shapes.standard.Polygon();
        shape.resize(100, 100);
        shape.position(x, y);
        shape.attr({
          body: {
            refPoints: "50,0 100,50 50,100 0,50",
            fill: "#ffd54f",
            stroke: "#333",
            strokeWidth: 2
          },
          label: {
            text: node.label,
            fill: "#333",
            fontSize: 14
          }
        });
        addInteractivePorts(shape);
      } else if (node.type === "group") {
        // Partition (group) node
        shape = new joint.shapes.standard.Rectangle();
        shape.resize(160, 60);
        shape.position(x, y);
        shape.attr({
          body: {
            rx: 10,
            ry: 10,
            fill: "#56c1ff",
            stroke: "#333",
            strokeWidth: 2
          },
          label: {
            text: node.label,
            fill: "#333",
            fontSize: 14
          }
        });
        addInteractivePorts(shape);
      } else if (node.type === "fork") {
        // Fork node
        shape = new joint.shapes.standard.Rectangle();
        shape.resize(160, 60);
        shape.position(x, y);
        shape.attr({
          body: {
            rx: 10,
            ry: 10,
            fill: "#f0f0f0",
            stroke: "#333",
            strokeWidth: 2
          },
          label: {
            text: node.label,
            fill: "#333",
            fontSize: 14
          }
        });
        addInteractivePorts(shape);
      } else {
        // Default rectangle node
        shape = new joint.shapes.standard.Rectangle();
        shape.resize(160, 60);
        shape.position(x, y);
        shape.attr({
          body: {
            rx: 10,
            ry: 10,
            fill: "#ffffff",
            stroke: "#333",
            strokeWidth: 2
          },
          label: {
            text: node.label,
            fill: "#333",
            fontSize: 14
          }
        });
        // add the interacitive handles (ports) to the nodes
        addInteractivePorts(shape);
      }

      shape.addTo(graphRef.current);
      jointNodesMap[node.id] = shape;
    });

    // Create edges with dashed lines and arrowheads
    edges.forEach((edge) => {
      const link = new joint.shapes.standard.Link();
      link.source(jointNodesMap[edge.source]);
      link.target(jointNodesMap[edge.target]);
      link.attr({
        line: {
          strokeWidth: 2,
          stroke: "#888",
          strokeDasharray: "5 5",
          targetMarker: {
            type: "path",
            d: "M 10 -5 0 0 10 5 z",
            fill: "#888",
          },
        },
      });
      if (edge.label) {
        link.appendLabel({
          attrs: {
            text: { text: edge.label, fill: "#333", fontSize: 12 },
            rect: { fill: "#FFF", stroke: "#ccc" },
          },
          position: { distance: 0.5 },
        });
      }
      link.addTo(graphRef.current);
    });

    // Adjust paper height
    const newHeight = Math.max(maxY + 100, MIN_HEIGHT);
    paperRef.current.setDimensions(FIXED_WIDTH, newHeight);
  }, [umlText]);

  // Zoom controls
  const handleZoomIn = () => setZoom((prev) => prev * 1.2);
  const handleZoomOut = () => setZoom((prev) => prev / 1.2);
  const handleResetZoom = () => setZoom(1);

  useEffect(() => {
    if (graphRef.current && paperRef.current) {
      // Get bounding box of all cells in the graph.
      const bbox = graphRef.current.getBBox();
      // Compute a new height that ensures all cells are visible (with extra padding).
      const newHeight = Math.max(bbox.y + bbox.height + 100, MIN_HEIGHT);
      // Set the paper dimensions taking zoom factor into account.
      // (Multiply the newHeight by zoom if you want the visible area to expand with zoom)
      paperRef.current.setDimensions(FIXED_WIDTH, newHeight * zoom);
    }
  }, [zoom]);

  // Addj g a cotext menu for right-click actions
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    cell: null,
  });

  // Listen for right-click events on cells
  useEffect(() => {
    if (paperRef.current) {
      // Listen for right-click (context menu) events on any cell.
      paperRef.current.on('cell:contextmenu', (cellView, evt, x, y) => {
        evt.preventDefault(); // Prevent the browser’s default context menu.
        setContextMenu({
          visible: true,
          x, // x coordinate relative to the container
          y, // y coordinate relative to the container
          cell: cellView.model, // store the target cell model
        });
      });
    }
  }, [paperRef.current]);

  // Hide context menu when clicking outside
  useEffect(() => {
    const hideContextMenu = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('click', hideContextMenu);
    // Cleanup function: Remove the event listener when the component unmounts
    // or before the effect re-runs.
    return () => {
      window.removeEventListener('click', hideContextMenu);
    };
  }, [contextMenu.visible]);

  // rename nodes
  const handleRename = () => {
    const currentLabel = contextMenu.cell.attr('label/text');
    const newLabel = prompt("Enter new label:", currentLabel);
    if (newLabel !== null) {
      contextMenu.cell.attr('label/text', newLabel);
    }
    setContextMenu(prev => ({ ...prev, visible: false }));
  };
  // delete nodes and edges
  const handleDelete = () => {
    contextMenu.cell.remove();
    setContextMenu(prev => ({ ...prev, visible: false }));
  };
  
  // Show ports on mouse hover and hide on mouse leave
  useEffect(() => {
    if (paperRef.current) {
      // Show ports on mouse enter.
      paperRef.current.on('cell:mouseenter', (cellView) => {
        cellView.$('[magnet]').attr('opacity', 1);
      });
  
      // Hide ports on mouse leave.
      paperRef.current.on('cell:mouseleave', (cellView) => {
        cellView.$('[magnet]').attr('opacity', 0);
      });
    }
  }, []);


  return (
    <div className="jointjs-demo-container">
      <div className="jointjs-left-panel">
        <h3>PlantUML Activity Diagram (JointJS Demo)</h3>
        <textarea
          className="jointjs-uml-textarea"
          value={umlText}
          onChange={(e) => setUmlText(e.target.value)}
        />
        <div className="jointjs-controls">
          <button className="jointjs-control-button" onClick={handleZoomIn}>
            Zoom In
          </button>
          <button className="jointjs-control-button" onClick={handleZoomOut}>
            Zoom Out
          </button>
          <button className="jointjs-control-button" onClick={handleResetZoom}>
            Reset Zoom
          </button>
        </div>
        <button
          className="jointjs-switch-button"
          onClick={() => (window.location.href = "#/reactflow_demo")}
        >
          Switch to React Flow Demo
        </button>
      </div>

      {/* The diagram container now has padding in CSS for spacing */}
      <div className="jointjs-diagram-container" ref={containerRef}>
        {/* The diagram is rendered inside this container */}
        {contextMenu.visible && (
          <div 
            className="custom-context-menu" 
            style={{
              position: 'absolute',
              top: contextMenu.y,
              left: contextMenu.x,
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
              zIndex: 1000,
            }}
          >
            <ul style={{ listStyle: 'none', margin: 0, padding: '5px 0' }}>
              <li 
                onClick={handleRename} 
                style={{ padding: '5px 10px', cursor: 'pointer' }}
              >
                Rename
              </li>
              <li 
                onClick={handleDelete} 
                style={{ padding: '5px 10px', cursor: 'pointer' }}
              >
                Delete
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
