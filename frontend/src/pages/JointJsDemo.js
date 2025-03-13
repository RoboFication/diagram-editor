import React, { useEffect, useRef, useState } from "react";
import * as joint from "jointjs";
import "../styles/JointJsDemo.css";
import parsePlantUML from "../parsing/parseActivityDiagrams";

export default function JointjsDemo() {
  const FIXED_WIDTH = 1000;    // Keep this width fixed
  const MIN_HEIGHT = 600;      // Minimum height
  const TOP_LEFT_MARGIN = 50;  // Margin from the top-left edge

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
    });
  }, []);

  useEffect(() => {
    if (!graphRef.current || !paperRef.current) return;

    // Parse the UML text using the advanced parser
    const { nodes, edges } = parsePlantUML(umlText);

    // Clear any existing diagram
    graphRef.current.clear();

    // Helper to determine default node dimensions
    const nodeDimensions = (node) => {
      if (node.type === "start" || node.type === "stop") {
        return { w: 60, h: 60 };
      } else if (node.type === "diamond") {
        return { w: 100, h: 100 };
      }
      // default rectangle
      return { w: 160, h: 60 };
    };

    // 1. Find the bounding box of the diagram (minX, minY, maxX, maxY)
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    nodes.forEach((node) => {
      const { x, y } = node.position;
      const { w, h } = nodeDimensions(node);

      if (x < minX) minX = x;
      if (y < minY) minY = y;

      const rightEdge = x + w;
      const bottomEdge = y + h;
      if (rightEdge > maxX) maxX = rightEdge;
      if (bottomEdge > maxY) maxY = bottomEdge;
    });

    // 2. Shift the diagram so minX >= TOP_LEFT_MARGIN and minY >= TOP_LEFT_MARGIN
    const offsetX = minX < TOP_LEFT_MARGIN ? TOP_LEFT_MARGIN - minX : 0;
    const offsetY = minY < TOP_LEFT_MARGIN ? TOP_LEFT_MARGIN - minY : 0;

    if (offsetX !== 0 || offsetY !== 0) {
      nodes.forEach((node) => {
        node.position.x += offsetX;
        node.position.y += offsetY;
      });
      // Update maxX/maxY after shifting
      maxX += offsetX;
      maxY += offsetY;
    }

    // 3. Create JointJS elements for each node
    const jointNodesMap = {};
    nodes.forEach((node) => {
      const { x, y } = node.position;
      let shape;

      if (node.type === "start" || node.type === "stop") {
        shape = new joint.shapes.standard.Circle();
        shape.resize(60, 60);
        shape.position(x, y);
        shape.attr("label/text", node.label);
        shape.attr("body/fill", node.type === "start" ? "#1bed88" : "red");
      } else if (node.type === "diamond") {
        shape = new joint.shapes.standard.Polygon();
        shape.attr("body/refPoints", "50,0 100,50 50,100 0,50");
        shape.resize(100, 100);
        shape.position(x, y);
        shape.attr("label/text", node.label);
        shape.attr("body/fill", "#ffd54f");
        shape.attr("body/stroke", "#222");
      } else if (node.type === "group") {
        shape = new joint.shapes.standard.Rectangle();
        shape.resize(160, 60);
        shape.position(x, y);
        shape.attr("label/text", node.label);
        shape.attr("body/fill", "#56c1ff");
        shape.attr("body/stroke", "#222");
      } else if (node.type === "fork") {
        shape = new joint.shapes.standard.Rectangle();
        shape.resize(160, 60);
        shape.position(x, y);
        shape.attr("label/text", node.label);
        shape.attr("body/fill", "#f0f0f0");
        shape.attr("body/stroke", "#222");
      } else {
        shape = new joint.shapes.standard.Rectangle();
        shape.resize(160, 60);
        shape.position(x, y);
        shape.attr("label/text", node.label);
        shape.attr("body/fill", "#fff");
        shape.attr("body/stroke", "#222");
      }

      shape.addTo(graphRef.current);
      jointNodesMap[node.id] = shape;
    });

    // 4. Create links for each edge
    edges.forEach((edge) => {
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

    // 5. Keep the paper width fixed; only adjust the height to fit the diagram.
    //    Add extra padding for the bottom (e.g. +100).
    const newHeight = Math.max(maxY + 100, MIN_HEIGHT);
    paperRef.current.setDimensions(FIXED_WIDTH, newHeight);

    // If the content extends beyond 1000px to the right, the container
    // can scroll horizontally (due to .diagram-container { overflow: auto }).
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
        .diagram-container can use flex to center the diagram horizontally,
        but the paper has a fixed width. If the container is narrower than 1000px,
        a horizontal scrollbar will appear. If it's wider, the paper is simply centered.

        Example CSS in JointJsDemo.css:

        .diagram-container {
          display: flex;
          justify-content: center; 
          overflow: auto;
          border: 1px solid #ccc; 
          min-height: 600px; 
          width: 100%;
          box-sizing: border-box;
        }
      */}
      <div className="diagram-container" ref={containerRef}></div>
    </div>
  );
}