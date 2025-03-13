import React, { useEffect, useRef, useState } from "react";
import * as joint from "jointjs";
import "../styles/JointJsDemo.css";
// Import the updated parser logic from parseActivityDiagrams.js
import parsePlantUML from "../parsing/parseActivityDiagrams";

export default function JointjsDemo() {
  const [umlText, setUmlText] = useState(`@startuml
start
:Load Configurations;
:Load Whisper Model;
stop
@enduml
`);
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const paperRef = useRef(null);

  // Initialize the JointJS graph and paper once
  useEffect(() => {
    graphRef.current = new joint.dia.Graph();

    // Create the Paper (the view)
    // We set initial dimensions; these will be updated dynamically after rendering nodes.
    paperRef.current = new joint.dia.Paper({
      el: containerRef.current,
      model: graphRef.current,
      width: 1000,
      height: 400,
      gridSize: 10,
      drawGrid: true,
      restrictTranslate: true,
    });
  }, []);

  // Update the diagram when umlText changes
  useEffect(() => {
    if (!graphRef.current || !paperRef.current) return;

    // Use the new parser that returns nodes with computed positions and improved edge labels.
    const { nodes, edges } = parsePlantUML(umlText);

    // Clear the graph for re-rendering
    graphRef.current.clear();

    // Map to hold JointJS element references by node id.
    const jointNodesMap = {};

    // Iterate over parsed nodes to create JointJS elements.
    nodes.forEach((node) => {
      let shape;

      // Use the computed positions from the parser
      const { x, y } = node.position;

      // Determine the shape and style based on node type.
      if (node.type === "start" || node.type === "stop") {
        // Create a circle for start/stop nodes.
        shape = new joint.shapes.standard.Circle();
        shape.resize(60, 60);
        shape.position(x, y);
        shape.attr("label/text", node.label);
        // Color coding for start (green) and stop (red)
        shape.attr("body/fill", node.type === "start" ? "green" : "red");
      } else if (node.type === "diamond") {
        // Create a diamond shape using a polygon.
        shape = new joint.shapes.standard.Polygon();
        // Define points to form a diamond shape.
        shape.attr("body/refPoints", "50,0 100,50 50,100 0,50");
        shape.resize(100, 100);
        shape.position(x, y);
        shape.attr("label/text", node.label);
        // For diamond nodes, we use transparent background and no border
        shape.attr("body/fill", "transparent");
        shape.attr("body/stroke", "#222");
      } else if (node.type === "group") {
        // Partition (group) node with light blue background.
        shape = new joint.shapes.standard.Rectangle();
        shape.resize(160, 60);
        shape.position(x, y);
        shape.attr("label/text", node.label);
        shape.attr("body/fill", "#add8e6");
        shape.attr("body/stroke", "#222");
      } else if (node.type === "fork") {
        // Fork node with a light gray background.
        shape = new joint.shapes.standard.Rectangle();
        shape.resize(160, 60);
        shape.position(x, y);
        shape.attr("label/text", node.label);
        shape.attr("body/fill", "#f0f0f0");
        shape.attr("body/stroke", "#222");
      } else {
        // Default rectangle node.
        shape = new joint.shapes.standard.Rectangle();
        shape.resize(160, 60);
        shape.position(x, y);
        shape.attr("label/text", node.label);
        shape.attr("body/fill", "#fff");
        shape.attr("body/stroke", "#222");
      }

      // Add the shape to the graph.
      shape.addTo(graphRef.current);
      // Keep track of the node by its id.
      jointNodesMap[node.id] = shape;
    });

    // Create links (edges) between nodes.
    edges.forEach((edge, index) => {
      const link = new joint.shapes.standard.Link();
      link.source(jointNodesMap[edge.source]);
      link.target(jointNodesMap[edge.target]);
      link.attr({
        line: {
          strokeWidth: 2,
          stroke: "#555",
          targetMarker: {
            type: "path",
            d: "M 10 -5 0 0 10 5 z",
            fill: "#555",
          },
        },
      });
      // Add edge label if present.
      if (edge.label) {
        link.appendLabel({
          attrs: {
            text: { text: edge.label, fill: "#000" },
            rect: { fill: "#FFF" },
          },
          position: { distance: 0.5 },
        });
      }
      link.addTo(graphRef.current);
    });

    // ---- Dynamic Paper Sizing ----
    // Compute the required paper dimensions based on the positions and sizes of all nodes.
    const allPositions = nodes.map((node) => {
      // Assume default sizes based on node type. Adjust if needed.
      let width = 160, height = 60;
      if (node.type === "start" || node.type === "stop") {
        width = height = 60;
      } else if (node.type === "diamond") {
        width = height = 100;
      }
      return { x: node.position.x + width, y: node.position.y + height };
    });
    const maxX = Math.max(...allPositions.map((p) => p.x), 1000) + 100; // Add some padding
    const maxY = Math.max(...allPositions.map((p) => p.y), 800) + 100;  // Add some padding

    // Update the paper dimensions to accommodate all nodes.
    paperRef.current.setDimensions(maxX, maxY);
  }, [umlText]);

  return (
    <div className="demo-container">
      <div className="left-panel">
        <h3>PlantUML Activity Diagram (JointJS Demo)</h3>
        <textarea
          className="uml-textarea"
          value={umlText}
          onChange={(e) => setUmlText(e.target.value)}
        />
        <button
          className="switch-button"
          onClick={() => (window.location.href = "#/reactflow_demo")}
        >
          Switch to React Flow Demo
        </button>
      </div>
      {/* 
          The diagram-container is styled via CSS to allow scrolling if the diagram exceeds the view. 
          You can ensure .diagram-container has styles like 'overflow: auto' in JointJsDemo.css.
      */}
      <div className="diagram-container" ref={containerRef}></div>
    </div>
  );
}