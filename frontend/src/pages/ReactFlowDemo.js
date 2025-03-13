import React, { useState, useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import DiamondNode from "../nodes/DiamondNode";
import "reactflow/dist/style.css";
import "../styles/ReactFlowDemo.css";

import parsePlantUML from "../parsing/parseActivityDiagrams";

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

    // Map the parsed nodes into React Flow nodes.
    // We use the computed positions from parsePlantUML rather than a fixed vertical spacing.
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

      let rfNodeType = "default";

      // Color the start node green, stop node red, partition node blue, if node yellow, etc.
      if (node.type === "start") {
        nodeStyle.width = 60;
        nodeStyle.height = 60;
        nodeStyle.borderRadius = "50%";
        nodeStyle.display = "flex";
        nodeStyle.alignItems = "center";
        nodeStyle.justifyContent = "center";
        nodeStyle.backgroundColor = "green"; // Start node
      } else if (node.type === "stop") {
        nodeStyle.width = 60;
        nodeStyle.height = 60;
        nodeStyle.borderRadius = "50%";
        nodeStyle.display = "flex";
        nodeStyle.alignItems = "center";
        nodeStyle.justifyContent = "center";
        nodeStyle.backgroundColor = "red"; // Stop node
      } else if (node.type === "group") {
        nodeStyle.backgroundColor = "#add8e6"; // Partition node in light-blue
      } else if (node.type === "fork") {
        nodeStyle.backgroundColor = "#f0f0f0"; // Light gray for Fork node
      } else if (node.type === "diamond") {
        // Update the style for a diamond shape:
        nodeStyle = {
          ...nodeStyle,
          width: 100,
          height: 100,
          backgroundColor: "transparent", // remove yellow from container
          border: "none",                 // no outer border
        };
        rfNodeType = "diamond";
      }

      // Use the position computed in parsePlantUML.
      return {
        id: node.id,
        data: { label: node.label },
        position: node.position,
        style: nodeStyle,
        type: rfNodeType,
      };
    });

    // Create React Flow edges from our parsed edges.
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

  useEffect(() => {
    const errorHandler = (e) => {
      if (
        e.message.includes(
          "ResizeObserver loop completed with undelivered notifications" ||
            "ResizeObserver loop limit exceeded"
        )
      ) {
        const resizeObserverErr = document.getElementById(
          "webpack-dev-server-client-overlay"
        );
        if (resizeObserverErr) {
          resizeObserverErr.style.display = "none";
        }
      }
    };
    window.addEventListener("error", errorHandler);

    return () => {
      window.removeEventListener("error", errorHandler);
    };
  }, []);

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
          nodeTypes={{ diamond: DiamondNode }} // register custom diamond node
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