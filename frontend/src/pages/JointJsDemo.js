import React, { useEffect, useRef, useState } from "react";
import * as joint from "jointjs"; // Ensure jointjs is installed
import "../styles/JointJsDemo.css";

function parsePlantUML(umlText) {
  const lines = umlText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !!l);

  let nodes = [];
  let edges = [];
  let previousNodeId = null;
  let nodeCount = 0;

  function createNode(label, type = "rectangle") {
    const id = `node_${nodeCount++}`;
    nodes.push({ id, label, type });
    return id;
  }

  function linkNodes(from, to, label = "") {
    edges.push({ source: from, target: to, label });
  }

  lines.forEach((line) => {
    if (line.startsWith("partition ")) {
    // partition "XYZ"
      const match = line.match(/partition\s+"([^"]+)"/);
      if (match) {
        const nodeId = createNode(`Partition: ${match[1]}`, "group");
        previousNodeId = nodeId;
      }
      return;
    }
    if (line === "start") {
      const nodeId = createNode("Start", "start");
      if (previousNodeId) linkNodes(previousNodeId, nodeId);
      previousNodeId = nodeId;
      return;
    }
    if (line === "stop") {
      const nodeId = createNode("Stop", "stop");
      if (previousNodeId) linkNodes(previousNodeId, nodeId);
      previousNodeId = nodeId;
      return;
    }
    if (line.startsWith(":") && line.endsWith(";")) {
      // :Load Configurations;
      const activity = line.slice(1, -1).trim();
      const nodeId = createNode(activity, "rectangle");
      if (previousNodeId) linkNodes(previousNodeId, nodeId);
      previousNodeId = nodeId;
      return;
    }
    if (line.startsWith("if")) {
      // if (condition) then ...
      const nodeId = createNode(line, "diamond");
      if (previousNodeId) linkNodes(previousNodeId, nodeId);
      previousNodeId = nodeId;
      return;
    }
    if (line.startsWith("else")) {
      const nodeId = createNode(line, "diamond");
      if (previousNodeId) linkNodes(previousNodeId, nodeId);
      previousNodeId = nodeId;
      return;
    }
    if (line.startsWith("fork")) {
      const nodeId = createNode("Fork", "fork");
      if (previousNodeId) linkNodes(previousNodeId, nodeId);
      previousNodeId = nodeId;
      return;
    }
    if (line.startsWith("end fork")) {
      const nodeId = createNode("End Fork", "fork");
      if (previousNodeId) linkNodes(previousNodeId, nodeId);
      previousNodeId = nodeId;
      return;
    }
  });

  return { nodes, edges };
}

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

  // Initialize JointJS graph and paper on first render
  useEffect(() => {
    graphRef.current = new joint.dia.Graph();

    // Create the Paper (the view), telling it which DOM element to mount into
    paperRef.current = new joint.dia.Paper({
      el: containerRef.current,
      model: graphRef.current,
      width: 1000,
      height: 10000,
      gridSize: 10,
      drawGrid: true,
      restrictTranslate: true,
    });
  }, []);

  // Each time umlText changes, we parse and re‐build the diagram
  useEffect(() => {
    if (!graphRef.current) return;
    const { nodes, edges } = parsePlantUML(umlText);
    
    // Clear the existing graph
    graphRef.current.clear();

    // place each node at x=50 and an incrementing y
    let currentY = 50;
    const jointNodesMap = {};

    // Create JointJS elements for each node
    nodes.forEach((node) => {
      let shape;
      // Basic shape selection by 'type'
      if (node.type === "start" || node.type === "stop") {
        shape = new joint.shapes.standard.Circle();
        shape.attr("label/text", node.label);
        shape.resize(80, 80);
      } else if (node.type === "diamond") {
        shape = new joint.shapes.standard.Polygon();
        shape.attr("label/text", node.label);
        shape.attr("body/refPoints", "0,10 10,0 20,10 10,20");
        shape.resize(100, 80);
      } else {
        shape = new joint.shapes.standard.Rectangle();
        shape.attr("label/text", node.label);
        shape.resize(160, 60);
      }
      shape.position(50, currentY);
      currentY += 100;
      shape.addTo(graphRef.current);

      // Keep track in a map so we can link them
      jointNodesMap[node.id] = shape;
    });

    // Create JointJS links for each edge
    edges.forEach((edge) => {
      const link = new joint.shapes.standard.Link();
      link.source(jointNodesMap[edge.source]);
      link.target(jointNodesMap[edge.target]);
      link.attr({
        line: {
          strokeWidth: 2,
          targetMarker: {
            type: "path",
            d: "M 10 -5 0 0 10 5 z",
            fill: "#555",
          },
        },
      });
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
      <div className="diagram-container" ref={containerRef}></div>
    </div>
  );
}