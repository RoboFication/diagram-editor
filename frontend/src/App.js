import React, { useEffect, useRef, useState } from 'react';
import _ from 'lodash';
import * as joint from 'jointjs';
import './App.css';

import { createRectangle, createLink } from './shapes';
import { parsePlantUML, buildJointJSFromPlantUML } from './parsePlantUML';
import { generatePlantUML } from './exportPlantUML';

function App() {
  const stencilRef = useRef(null);
  const paperRef = useRef(null);

  const [graph, setGraph] = useState(null);
  const [stencilGraph, setStencilGraph] = useState(null);

  const [umlText, setUmlText] = useState('');    // auto-generated UML
  const [loadText, setLoadText] = useState(`@startuml
rectangle "SampleBlock" as A1
rectangle "AnotherBlock" as A2
A1 --> A2
@enduml`);  // text to parse on "Load UML"
  const [pngUrl, setPngUrl] = useState('');

  // 1) Initialize the main graph/paper & stencil
  useEffect(() => {
    const mainGraph = new joint.dia.Graph();
    setGraph(mainGraph);

    const paper = new joint.dia.Paper({
      el: paperRef.current,
      model: mainGraph,
      width: 600,
      height: 400,
      gridSize: 10,
      drawGrid: true,
      interactive: true
    });

    // Stencil
    const stGraph = new joint.dia.Graph();
    setStencilGraph(stGraph);

    const stPaper = new joint.dia.Paper({
      el: stencilRef.current,
      model: stGraph,
      width: 150,
      height: 400,
      interactive: false
    });

    // Add shapes to stencil
    stGraph.addCell(createRectangle());
    stGraph.addCell(createLink());

    // Drag-and-drop
    let currentElement = null;
    stPaper.on('cell:pointerdown', cellView => {
      currentElement = cellView.model.clone();
    });

    paperRef.current.addEventListener('mouseup', evt => {
      if (currentElement) {
        const r = paper.el.getBoundingClientRect();
        const x = evt.clientX - r.left;
        const y = evt.clientY - r.top;
        currentElement.position(x, y);
        mainGraph.addCell(currentElement);
        currentElement = null;
      }
    });

    return () => {
      paperRef.current.removeEventListener('mouseup', () => {});
    };
  }, []);

  // 2) Debounced auto-update: generate UML, fetch PNG
  const doAutoUpdate = () => {
    if (!graph) return;
    const uml = generatePlantUML(graph);
    setUmlText(uml);

    // fetch to /render
    fetch('http://localhost:8000/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uml })
    })
      .then(resp => {
        if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
        return resp.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        setPngUrl(url);
      })
      .catch(err => console.error('Error generating PNG:', err));
  };
  const debouncedUpdate = _.debounce(doAutoUpdate, 700);

  useEffect(() => {
    if (!graph) return;
    const onChange = () => {
      debouncedUpdate();
    };
    graph.on('add change remove', onChange);
    return () => {
      graph.off('add change remove', onChange);
    };
  }, [graph]);

  // 3) "Save Diagram" => /save
  const handleSave = () => {
    fetch('http://localhost:8000/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uml: umlText })
    })
      .then(resp => {
        if (!resp.ok) throw new Error(`Save error: ${resp.status}`);
        return resp.json();
      })
      .then(json => {
        alert(`Diagram saved:\n${JSON.stringify(json, null, 2)}`);
      })
      .catch(err => {
        console.error('Error saving:', err);
        alert('Failed to save diagram');
      });
  };

  // 4) "Load UML" => parse & build from loadText
  const handleLoad = () => {
    if (!graph) return;
    buildJointJSFromPlantUML(loadText, graph);
  };

  return (
    <div style={{ margin: '20px' }}>
      <h1>React + JointJS + FastAPI (Auto Update + Save)</h1>

      <div
        style={{ float: 'left', border: '1px solid #ccc', width: '150px', height: '400px' }}
        ref={stencilRef}
      ></div>
      <div
        style={{ float: 'left', border: '1px solid #000', width: '600px', height: '400px', marginLeft: '10px' }}
        ref={paperRef}
      ></div>

      <div style={{ clear: 'both', marginTop: '20px' }}>
        <button onClick={handleSave}>Save Diagram</button>
        <button onClick={handleLoad}>Load UML</button>
      </div>

      {/* 1) auto-updated UML code area (read-only) */}
      <h3>PlantUML (Auto-Updated)</h3>
      <textarea rows="6" cols="80" value={umlText} readOnly />

      {/* 2) user-editable UML code area => parse on "Load UML" */}
      <h3>Load UML Text</h3>
      <textarea
        rows="6"
        cols="80"
        value={loadText}
        onChange={e => setLoadText(e.target.value)}
      />

      <h3>PNG Preview</h3>
      {pngUrl && (
        <img
          src={pngUrl}
          alt="PNG Diagram"
          style={{ border: '1px solid #ccc', maxWidth: '80%' }}
        />
      )}
    </div>
  );
}

export default App;
