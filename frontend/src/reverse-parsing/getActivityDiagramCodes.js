// reverseParsePlantUML.js
// This function reverse-parses a JointJS graph into a PlantUML script.
// It builds dictionaries for nodes and their outgoing links, then recursively traverses
// the graph, taking into account conditionals (diamond nodes), forks, partitions, and normal activities.
// When a "stop" node is encountered in a branch, that branch is marked as terminated but does not
// necessarily stop the entire diagram generation (other branches may continue).
export default function reverseParsePlantUML(graph) {
    if (!graph) return "";
  
    // Build a dictionary of node cells and an adjacency list from link cells.
    const cells = graph.getCells();
    const nodeCells = cells.filter(cell => cell.isElement());
    const linkCells = cells.filter(cell => cell.isLink());
  
    // Create a dictionary of nodes: { [id]: { id, label, type } }
    const nodes = {};
    nodeCells.forEach(cell => {
      nodes[cell.id] = {
        id: cell.id,
        label: cell.attr("label/text") || "",
        type: cell.get("type") // e.g., "standard.Circle", "standard.Rectangle", "standard.Polygon"
      };
    });
  
    // Create an adjacency list of outgoing links.
    // Each entry is: adj[sourceId] = [{ target, label }, ...]
    const adj = {};
    linkCells.forEach(link => {
      const source = link.source();
      const target = link.target();
      if (!source.id || !target.id) return;
      const edgeLabel = link.attr("label/text") || "";
      if (!adj[source.id]) {
        adj[source.id] = [];
      }
      adj[source.id].push({ target: target.id, label: edgeLabel });
    });
  
    // Determine the start node:
    let startNodeId = null;
    for (let id in nodes) {
      if (nodes[id].label.trim().toLowerCase() === "start") {
        startNodeId = id;
        break;
      }
    }
    // If no explicit "start" is found, choose the topmost node (smallest y coordinate).
    if (!startNodeId) {
      let minY = Infinity;
      nodeCells.forEach(cell => {
        const pos = cell.position();
        if (pos.y < minY) {
          minY = pos.y;
          startNodeId = cell.id;
        }
      });
    }
  
    // Recursive traversal function.
    // It returns an object { lines: [...], terminated: boolean }
    // where terminated indicates that this branch ended with a "stop" node.
    function traverse(nodeId, visited = new Set()) {
      if (visited.has(nodeId)) return { lines: [], terminated: false };
      visited.add(nodeId);
      const node = nodes[nodeId];
      const lowerLabel = node.label.trim().toLowerCase();
      let lines = [];
      let terminated = false;
  
      // Process based on node type and label:
      if (lowerLabel === "start") {
        lines.push("start");
      } else if (lowerLabel === "stop") {
        lines.push("stop");
        terminated = true;
        // Return immediately for this branch.
        return { lines, terminated };
      }
      // For diamond nodes (assumed to be conditionals)
      else if (node.type === "standard.Polygon") {
        // If there are at least two outgoing edges, we treat this as an if/else.
        const outs = adj[nodeId] || [];
        if (outs.length >= 2) {
          // Try to distinguish branches by edge labels.
          const yesEdge = outs.find(e => e.label.toLowerCase().includes("yes")) || outs[0];
          const noEdge = outs.find(e => e.label.toLowerCase().includes("no")) || (outs[1] || null);
          lines.push(`if (${node.label}) then (${yesEdge.label || "Yes"})`);
          const yesBranch = traverse(yesEdge.target, new Set(visited));
          lines = lines.concat(yesBranch.lines);
          if (noEdge) {
            lines.push(`else (${noEdge.label || "No"})`);
            const noBranch = traverse(noEdge.target, new Set(visited));
            lines = lines.concat(noBranch.lines);
            // Mark the diamond as terminated only if both branches ended with stop.
            terminated = yesBranch.terminated && noBranch.terminated;
          }
          lines.push("endif");
          return { lines, terminated };
        } else {
          // Not enough branches – treat as normal activity.
          lines.push(`: ${node.label};`);
        }
      }
      // Partition nodes (rectangles with a label starting with "partition")
      else if (node.type === "standard.Rectangle" && lowerLabel.startsWith("partition")) {
        const partitionName = node.label.replace(/partition\s*:?\s*/i, "");
        lines.push(`partition "${partitionName}"`);
      }
      // Fork nodes (rectangles with label "fork")
      else if (node.type === "standard.Rectangle" && lowerLabel === "fork") {
        lines.push("fork");
        const outs = adj[nodeId] || [];
        let branchTerminated = true;
        outs.forEach((edge, idx) => {
          const branch = traverse(edge.target, new Set(visited));
          lines = lines.concat(branch.lines);
          if (idx < outs.length - 1) {
            lines.push("fork again");
          }
          branchTerminated = branchTerminated && branch.terminated;
        });
        lines.push("end fork");
        terminated = branchTerminated;
        return { lines, terminated };
      }
      // For all other nodes, treat as normal activity.
      else {
        lines.push(`: ${node.label};`);
      }
  
      // If there is exactly one outgoing edge and this branch hasn't terminated,
      // continue with that connection.
      const outs = adj[nodeId] || [];
      if (outs.length === 1 && !terminated) {
        const next = traverse(outs[0].target, visited);
        lines = lines.concat(next.lines);
        terminated = next.terminated;
      }
      return { lines, terminated };
    }
  
    // Generate the UML script.
    const result = traverse(startNodeId);
    const umlLines = [];
    umlLines.push("@startuml");
    umlLines.push(...result.lines);
    // At the global level, if not terminated, ensure we end with a stop.
    if (!result.terminated) {
      umlLines.push("stop");
    }
    umlLines.push("@enduml");
    return umlLines.join("\n");
  }
  