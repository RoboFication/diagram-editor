import React from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import JointjsDemo from "./pages/JointJsDemo";
import ReactFlowDemo from "./pages/ReactFlowDemo";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/jointjs_demo" replace />} />
        <Route path="/jointjs_demo" element={<JointjsDemo />} />
        <Route path="/reactflow_demo" element={<ReactFlowDemo />} />
      </Routes>
    </Router>
  );
}

export default App;