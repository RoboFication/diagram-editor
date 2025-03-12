import React from "react";
import { Handle } from "reactflow";

export default function DiamondNode({ data }) {
  return (
    <div style={{ position: "relative", width: 100, height: 100 }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <polygon
          points="50,0 100,50 50,100 0,50"
          fill="#ffd54f"
          stroke="#222"
          strokeWidth="2"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {data.label}
      </div>
      {/* Define connection handles to force consistent edge anchoring */}
      <Handle
        type="target"
        position="top"
      />
      <Handle
        type="source"
        position="bottom"
      />
    </div>
  );
}
