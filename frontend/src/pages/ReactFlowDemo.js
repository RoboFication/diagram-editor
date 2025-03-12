import React, { useState, useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import "../styles/ReactFlowDemo.css";

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
      const activity = line.slice(1, -1).trim();
      const nodeId = createNode(activity, "rectangle");
      if (previousNodeId) linkNodes(previousNodeId, nodeId);
      previousNodeId = nodeId;
      return;
    }
    if (line.startsWith("if")) {
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

export default function ReactFlowDemo() {
  const [umlText, setUmlText] = useState(`@startuml
start
:Load Configurations;
:Load Whisper Model;
stop
@enduml
`);

  // Keep nodes and edges in state so changes persist
  const [rfNodes, setRfNodes] = useState([]);
  const [rfEdges, setRfEdges] = useState([]);

  // Parse UML text and set nodes/edges only when umlText changes
  useEffect(() => {
    const { nodes, edges } = parsePlantUML(umlText);
    let currentY = 50;
    const newRfNodes = nodes.map((node) => {
      // Define default styles; customize per node type
      let nodeStyle = {
        border: "2px solid #222",
        padding: 10,
        borderRadius: 0,
        backgroundColor: "#fff",
        color: "#333",
        width: 120,
        textAlign: "center",
      };
      if (node.type === "start" || node.type === "stop") {
        nodeStyle.width = 60;
        nodeStyle.height = 60;
        nodeStyle.borderRadius = "50%";
        nodeStyle.display = "flex";
        nodeStyle.alignItems = "center";
        nodeStyle.justifyContent = "center";
        nodeStyle.backgroundColor = "#90ee90"; // light green
      } else if (node.type === "diamond") {
        nodeStyle.backgroundColor = "#ffd54f"; // light amber
      }
      const rfNode = {
        id: node.id,
        data: { label: node.label },
        position: { x: 50, y: currentY },
        style: nodeStyle,
      };
      currentY += 100;
      return rfNode;
    });

    const newRfEdges = edges.map((edge, index) => ({
      id: `e-${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      type: "smoothstep", // for modern, curved edges
      label: edge.label || "",
    }));

    setRfNodes(newRfNodes);
    setRfEdges(newRfEdges);
  }, [umlText]);

  // Handlers to update node/edge positions when moved
  const onNodesChange = (changes) => {
    setRfNodes((nds) => applyNodeChanges(changes, nds));
  };

  const onEdgesChange = (changes) => {
    setRfEdges((eds) => applyEdgeChanges(changes, eds));
  };

  return (
    <div className="demo-container">
      <div className="left-panel">
        <h3>PlantUML Activity Diagram (React Flow Demo)</h3>
        <textarea
          className="uml-textarea"
          value={umlText}
          onChange={(e) => setUmlText(e.target.value)}
        />
        <button
          className="switch-button"
          onClick={() => (window.location.href = "#/jointjs_demo")}
        >
          Switch to JointJS Demo
        </button>
      </div>

      <div className="flow-container">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          style={{ width: "100%", height: "80vh" }}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}