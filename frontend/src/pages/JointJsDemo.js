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
      </div>
    </div>
  );
}
