import React, { useEffect, useRef, useState } from 'react';
import _ from 'lodash';
import * as joint from 'jointjs';
import './App.css';  // only style file

import { initializeGraphs } from './initGraphs';   // shob constructor jinish etay bhorbo
import { exportBDDPlantUML } from './exportBDDPlantUML';
import { buildJointJSFromBDD } from './parseBDDPlantUML';
import EditModal from './EditModal';

function App() {
  const stencilRef = useRef(null);
  const paperRef = useRef(null);

  const [graph, setGraph] = useState(null);
  const [mainPaper, setMainPaper] = useState(null);
  const [stencilGraph, setStencilGraph] = useState(null);

  const [umlText, setUmlText] = useState('');
  const [loadText, setLoadText] = useState(`@startuml
class "Vehicle" <<block>> {
  +weight: float
  +speed: float
}

class "Car" <<block>> {
  +brand: String
  +model: String
}

Car --|> Vehicle : Generalization
Car *-- "1" Engine : composed of
Car o-- "1..*" ElectricEngine : alternative propulsion
@enduml

`);
  const [pngUrl, setPngUrl] = useState('');

  // For multiline editor
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editModalText, setEditModalText] = useState('');
  const [editingElement, setEditingElement] = useState(null);

  // 1) Initialize Graphs & Papers
  useEffect(() => {
    // We'll pass a callback for "element dblclick => open multiline editor"
    const onElementDblClick = (model) => {
      const currentLabel = model.attr('label/text') || '';
      setEditModalText(currentLabel);
      setEditingElement(model);
      setEditModalVisible(true);
    };

    const { mainGraph } = initializeGraphs({
      stencilRef,
      paperRef,
      setGraph,
      setMainPaper,
      setStencilGraph,
      onElementDblClick,
      // optional: override widths/heights inside initializeGraphs if you want
    });

    // Cleanup event
    return () => {
      if (paperRef.current) {
        paperRef.current.removeEventListener('mouseup', () => {});
      }
    };
  }, []);

  // 2) Debounced UML => PNG
  const doAutoUpdate = () => {
    if (!graph) return;
    const uml = exportBDDPlantUML(graph);
    setUmlText(uml);

    // If you have a local server to render PNG
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
  const debouncedUpdate = _.debounce(doAutoUpdate, 600);

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

  // 3) Save
  const handleSaveDiagram = () => {
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

  // 4) Load
  const handleLoadUML = () => {
    if (graph) {
      buildJointJSFromBDD(loadText, graph);
    }
  };

  // 5) Modal (multiline text editing)
  const handleModalCancel = () => setEditModalVisible(false);
  const handleModalSave = (newText) => {
    setEditModalVisible(false);
    if (editingElement) {
      editingElement.attr('label/text', newText);
    }
  };

  return (
    <div className="app-container">
      <h1>BDD Diagram (Composition vs Association)</h1>

      {/* Left: Stencil */}
      <div className="stencil-container" ref={stencilRef} />

      {/* Right: Main Paper */}
      <div className="paper-container" ref={paperRef} />

      <div className="clearfix">
        <button onClick={handleSaveDiagram}>Save Diagram</button>
        <button onClick={handleLoadUML}>Load UML</button>
      </div>

      <h3>BDD PlantUML (Auto-Updated)</h3>
      <textarea rows="6" cols="80" value={umlText} readOnly />

      <h3>Load UML</h3>
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
          alt="BDD Diagram"
          style={{ border: '1px solid #ccc', maxWidth: '80%' }}
        />
      )}

      <EditModal
        visible={editModalVisible}
        initialText={editModalText}
        onCancel={handleModalCancel}
        onSave={handleModalSave}
      />
    </div>
  );
}

export default App;
