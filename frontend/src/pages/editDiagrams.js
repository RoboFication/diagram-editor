import React, { useEffect, useRef, useState } from "react";
import _ from "lodash";
import * as joint from "jointjs";
import { initializeGraphs } from "../utils/initGraphs";
import { DIAGRAM_TYPES } from "../utils/diagramTypes";
import EditModal from "../utils/EditModal";
import "../Styles/editDiagrams.css";

import diagramService from "../api/api";

const EditDiagrams = () => {
  const stencilRef = useRef(null);
  const paperRef = useRef(null);

  const [graph, setGraph] = useState(null);
  const [mainPaper, setMainPaper] = useState(null);
  const [stencilGraph, setStencilGraph] = useState(null);
  const [selectedDiagramType, setSelectedDiagramType] = useState(
    DIAGRAM_TYPES.NONE.id
  );
  const [exportFunction, setExportFunction] = useState(null);
  const [parseFunction, setParseFunction] = useState(null);

  const [umlText, setUmlText] = useState("");
  const [loadText, setLoadText] = useState(`@startuml
class Car <<block>> {
  horsepower=100
  color=red
}
class Engine <<block>> {
  type=V8
}
Car --* Engine : <<composition>>
@enduml
`);
  const [pngUrl, setPngUrl] = useState("");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editModalText, setEditModalText] = useState("");
  const [editingElement, setEditingElement] = useState(null);

  // Load diagram-specific functions when diagram type changes
  useEffect(() => {
    if (selectedDiagramType === DIAGRAM_TYPES.NONE.id) return;

    // In editDiagrams.js
    const loadDiagramFunctions = async () => {
      const diagramConfig = DIAGRAM_TYPES[selectedDiagramType];
      console.log(`🔄 Loading ${diagramConfig.name} modules...`);

      try {
        let diagramModule;

        // Handle each diagram type with a lookup object
        const diagramImports = {
          BDD: () => import("../utils/BDD/BDDDiagram"),
          IBD: () => import("../utils/IBD/IBDDiagram"),
          ACT: () => import("../utils/ACT/ACTDiagram"),
          UC: () => import("../utils/UC/UCDiagram"),
          // Add other diagram types here as they're implemented
        };

        // Check if we have an import function for this diagram type
        if (diagramImports[selectedDiagramType]) {
          console.log(
            `Attempting to import ${selectedDiagramType} module dynamically`
          );
          diagramModule = await diagramImports[selectedDiagramType]();
          console.log("Import successful:", diagramModule);

          if (diagramModule.exportDiagram && diagramModule.parseDiagram) {
            setExportFunction(() => diagramModule.exportDiagram);
            setParseFunction(() => diagramModule.parseDiagram);
            console.log(`✅ ${diagramConfig.name} - Import successful`);
          } else {
            console.log(
              `⚠️ ${diagramConfig.name} - Required functions not found in module`
            );
          }
        } else {
          console.log(
            `❓ ${diagramConfig.name} - No import configuration found`
          );
        }
      } catch (error) {
        console.log(`❌ ${diagramConfig.name} - Import failed:`, error.message);
        console.log(`Full error:`, error);
      }
    };

    loadDiagramFunctions();
  }, [selectedDiagramType]);

  // Initialize graph when BDD is selected
  useEffect(() => {
    if (
      selectedDiagramType !== "BDD" ||
      !stencilRef.current ||
      !paperRef.current
    ) {
      return;
    }

    const onElementDblClick = (model) => {
      const currentLabel = model.attr("label/text") || "";
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
    });

    return () => {
      if (paperRef.current) {
        paperRef.current.removeEventListener("mouseup", () => {});
      }
      if (graph) {
        graph.clear();
      }
      setGraph(null);
      setMainPaper(null);
      setStencilGraph(null);
    };
  }, [selectedDiagramType]);

  // const doAutoUpdate = () => {
  //   if (!graph || !exportFunction) return;
  //   const uml = exportFunction(graph);
  //   setUmlText(uml);

  //   fetch("http://localhost:8000/render", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ uml }),
  //   })
  //     .then((resp) => {
  //       if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
  //       return resp.blob();
  //     })
  //     .then((blob) => {
  //       const url = URL.createObjectURL(blob);
  //       setPngUrl(url);
  //     })
  //     .catch((err) => console.error("Error generating PNG:", err));
  // };

  // const debouncedUpdate = _.debounce(doAutoUpdate, 600);

  const doAutoUpdate = async () => {
    if (!graph || !exportFunction) return;
    const uml = exportFunction(graph);
    setUmlText(uml);

    try {
      const url = await diagramService.renderDiagram(uml);
      setPngUrl(url);
    } catch (err) {
      console.error("Error generating PNG:", err);
    }
  };

  const debouncedUpdate = _.debounce(doAutoUpdate, 600);

  useEffect(() => {
    if (!graph) return;
    const onChange = () => {
      debouncedUpdate();
    };
    graph.on("add change remove", onChange);
    return () => {
      graph.off("add change remove", onChange);
    };
  }, [graph]);

  // const handleSaveDiagram = () => {
  //   fetch("http://localhost:8000/save", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ uml: umlText }),
  //   })
  //     .then((resp) => {
  //       if (!resp.ok) throw new Error(`Save error: ${resp.status}`);
  //       return resp.json();
  //     })
  //     .then((json) => {
  //       alert(`Diagram saved:\n${JSON.stringify(json, null, 2)}`);
  //     })
  //     .catch((err) => {
  //       console.error("Error saving:", err);
  //       alert("Failed to save diagram");
  //     });
  // };

  const handleSaveDiagram = async () => {
    if (!umlText || umlText.trim() === "") {
      alert("Cannot save empty diagram");
      return;
    }

    try {
      const result = await diagramService.saveDiagram(umlText);
      alert(`Diagram saved:\n${JSON.stringify(result, null, 2)}`);
    } catch (err) {
      console.error("Error saving:", err);
      const errorMessage = err.response?.data || "Failed to save diagram";
      alert(errorMessage);
    }
  };

  const handleLoadUML = () => {
    if (graph && parseFunction) {
      parseFunction(loadText, graph);
    }
  };

  const handleModalCancel = () => setEditModalVisible(false);

  const handleModalSave = (newText) => {
    setEditModalVisible(false);
    if (editingElement) {
      editingElement.attr("label/text", newText);
    }
  };

  const handleDiagramTypeChange = (event) => {
    const newType = event.target.value;
    setSelectedDiagramType(newType);

    // Clear everything when switching diagram types
    if (graph) {
      graph.clear();
    }
    setUmlText("");
    setPngUrl("");
    setGraph(null);
    setMainPaper(null);
    setStencilGraph(null);
  };

  return (
    <div className="diagram-editor">
      <div className="diagram-header">
        <select
          value={selectedDiagramType}
          onChange={handleDiagramTypeChange}
          className="diagram-selector"
        >
          {Object.values(DIAGRAM_TYPES).map((type) => (
            <option key={type.id} value={type.id} disabled={type.id === "NONE"}>
              {type.name}
            </option>
          ))}
        </select>
        {selectedDiagramType === "BDD" && (
          <span className="diagram-indicator">BDD Selected</span>
        )}
      </div>

      {selectedDiagramType === "BDD" && (
        <>
          <div className="stencil-container" ref={stencilRef} />
          <div className="paper-container" ref={paperRef} />

          <div className="clearfix">
            <button onClick={handleSaveDiagram}>Save Diagram</button>
            <button onClick={handleLoadUML}>Load UML</button>
          </div>

          <h3>PlantUML (Auto-Updated)</h3>
          <textarea rows="6" cols="80" value={umlText} readOnly />

          <h3>Load UML</h3>
          <textarea
            rows="6"
            cols="80"
            value={loadText}
            onChange={(e) => setLoadText(e.target.value)}
          />

          <h3>PNG Preview</h3>
          {pngUrl && (
            <img
              src={pngUrl}
              alt="BDD Diagram"
              style={{ border: "1px solid #ccc", maxWidth: "80%" }}
            />
          )}
        </>
      )}

      <EditModal
        visible={editModalVisible}
        initialText={editModalText}
        onCancel={handleModalCancel}
        onSave={handleModalSave}
      />
    </div>
  );
};

export default EditDiagrams;
