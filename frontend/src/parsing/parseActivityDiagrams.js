// Updated parsePlantUML function with advanced parsing and layout logic.
// Note: This implementation uses a stack-based approach for if/else and fork blocks.
// It also computes (x,y) positions for nodes based on branch context to mimic the PlantUML layout.
// We have further refined the logic to:
//   - Properly link the start node to the next node
//   - Link partition nodes to their previous node
//   - Extract only the condition text for 'if' nodes
//   - Label edges out of the diamond with Yes/No if "then (Yes)" / "else (No)" is detected
//   - Do not automatically merge branches with a "Merge" node on endif
export default function parsePlantUML(umlText) {
    const lines = umlText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => !!l);
  
    let nodes = [];
    let edges = [];
    let nodeCount = 0;
  
    // Layout variables: currentX and currentY define where the next node is placed.
    let currentX = 50;
    let currentY = 50;
    // xStack to save/restore x offsets when entering/exiting nested blocks.
    let xStack = [];
  
    // Context stack to handle if/else and fork blocks.
    let contextStack = [];
  
    // createNode now accepts an optional position.
    function createNode(label, type = "rectangle", pos = null) {
      const id = `node_${nodeCount++}`;
      // Use the provided position if available; otherwise use currentX/currentY.
      const position = pos || { x: currentX, y: currentY };
      nodes.push({ id, label, type, position });
      // For sequential flow, bump y by 100 after each node.
      currentY += 100;
      return id;
    }
  
    // Enhanced linkNodes so we can pass an optional edge label.
    function linkNodes(from, to, label = "") {
      edges.push({ source: from, target: to, label });
    }
  
    // A small helper to link from the "current" context or, if none, from the global last node.
    function linkFromPrevious(nodeId) {
      if (contextStack.length > 0) {
        let ctx = contextStack[contextStack.length - 1];
    
        // Default no label
        let edgeLabel = "";
    
        // If we’re inside an if-block, choose yesLabel or noLabel based on ctx.branch
        if (ctx.type === "if") {
          if (ctx.branch === "then") {
            edgeLabel = ctx.yesLabel || "";
          } else if (ctx.branch === "else") {
            edgeLabel = ctx.noLabel || "";
          }
        }
    
        // Link from the last node in that context
        linkNodes(ctx.lastBranchNode, nodeId, edgeLabel);
        // Update that context’s last node
        ctx.lastBranchNode = nodeId;
      } else {
        // Outside any block
        if (nodes.length > 1) {
           // If no context, link from the previously created node in the global flow
          const prev = nodes[nodes.length - 2].id;
          linkNodes(prev, nodeId);
        }
      }
    }
  
    // Helper to parse "if (Condition) then (Yes)" lines
    // Returns { conditionText, yesLabel }
    function parseIfLine(line) {
      // Example: "if (Devices Found?) then (Yes)"
      // We want to extract "Devices Found?" as the condition, and "Yes" as the label for the then branch.
      let conditionText = "Condition?";
      let yesLabel = "";
      // Regex to capture if ( ... ) then ( ... )
      const ifRegex = /if\s*\(\s*(.*?)\s*\)\s*then\s*\(\s*(.*?)\s*\)/i;
      const match = ifRegex.exec(line);
      if (match) {
        conditionText = match[1].trim(); // e.g. "Devices Found?"
        yesLabel = match[2].trim();      // e.g. "Yes"
      } else {
        // Fallback: maybe there's no "then(...)"
        // Just try to parse "if (Condition)" alone
        const ifOnlyRegex = /if\s*\(\s*(.*?)\s*\)/i;
        const ifOnlyMatch = ifOnlyRegex.exec(line);
        if (ifOnlyMatch) {
          conditionText = ifOnlyMatch[1].trim();
        }
      }
      return { conditionText, yesLabel };
    }
  
    // Helper to parse "else (No)" lines
    // Returns the label inside parentheses, e.g. "No"
    function parseElseLine(line) {
      // Example: "else (No)"
      const elseRegex = /else\s*\(\s*(.*?)\s*\)/i;
      const match = elseRegex.exec(line);
      if (match) {
        return match[1].trim();
      }
      return "";
    }
  
    lines.forEach((line) => {
      // Original partition handling updated to link from previous node.
      if (line.startsWith("partition ")) {
        const match = line.match(/partition\s+"([^"]+)"/);
        if (match) {
          const nodeId = createNode(`Partition: ${match[1]}`, "group");
          // Link from the previous node or context
          linkFromPrevious(nodeId);
        }
        return;
      }
  
      // Original handling for start
      if (line === "start") {
        const nodeId = createNode("Start", "start");
        // Always try to link from the previous node or context if any
        linkFromPrevious(nodeId);
        return;
      }
  
      // Original handling for stop
      // Note: also catch "stop;" just in case
      if (line === "stop" || line === "stop;") {
        const nodeId = createNode("Stop", "stop");
        linkFromPrevious(nodeId);
        return;
      }
  
      // Activity nodes (e.g., :Load Configurations;) remain similar but link from previous.
      if (line.startsWith(":") && line.endsWith(";")) {
        const activity = line.slice(1, -1).trim();
        const nodeId = createNode(activity, "rectangle");
        linkFromPrevious(nodeId);
        return;
      }
  
      // ----- Advanced logic for IF/ELSE blocks -----
      if (line.startsWith("if")) {
        // Extract condition text and "then" label
        const { conditionText, yesLabel } = parseIfLine(line);
        // Create a diamond node with the condition text only
        const nodeId = createNode(conditionText, "diamond");
        // Link from previous node
        linkFromPrevious(nodeId);
        // Push an if-context onto the stack to track branches
        contextStack.push({
          type: "if",
          condition: nodeId,
          yesLabel,
          noLabel: "",
          branch: "then", // we begin in the 'then' branch
          parentX: currentX, // save parent's x for later restoration
          lastBranchNode: nodeId,
        });
        // Adjust layout: for the then branch, shift to the right.
        xStack.push(currentX);
        currentX += 150;
        return;
      }
  
      if (line.startsWith("else")) {
        // We have reached the else portion. We parse the label in parentheses, if any.
        let ctx = contextStack[contextStack.length - 1];
        ctx.noLabel = parseElseLine(line); // e.g. "No"
        // The 'then' branch is effectively finished, so we store that final node if needed.
        ctx.thenBranchEnd = ctx.lastBranchNode;
        // Switch to the else branch: reset x to parent's value, then shift left
        currentX = ctx.parentX - 150;
        // Also set lastBranchNode back to the if node (the diamond),
        // so the next activity line will link from the diamond again.
        ctx.lastBranchNode = ctx.condition;
        ctx.branch = "else";
        return;
      }
  
      if (line.startsWith("endif")) {
        // The user does NOT want an automatic merge node here. So we simply pop the context.
        let ctx = contextStack.pop();
        // Mark the end of the else branch
        ctx.elseBranchEnd = ctx.lastBranchNode;
        // Restore the x position from before the if block
        currentX = xStack.pop();
        return;
      }
  
      // ----- Advanced logic for FORK blocks -----
      if (line.startsWith("fork") && !line.startsWith("fork again")) {
        // We create an actual 'Fork' node
        const forkNodeId = createNode("Fork", "fork");
        // Link from the previous node
        linkFromPrevious(forkNodeId);
  
        // Push a fork context
        contextStack.push({
          type: "fork",
          forkStart: forkNodeId,
          branchEnds: [],
          branchIndex: 0,
          parentX: currentX,
          lastBranchNode: forkNodeId,
        });
        // For the first branch of the fork, shift x to the right.
        xStack.push(currentX);
        currentX += 150;
        return;
      }
  
      if (line.startsWith("fork again")) {
        // End the current branch of the fork by recording its last node.
        let ctx = contextStack[contextStack.length - 1];
        ctx.branchEnds.push(ctx.lastBranchNode || ctx.forkStart);
        // Prepare for the next fork branch: increment branch index.
        ctx.branchIndex++;
        // For simplicity, alternate x offset (right for even, left for odd branches).
        currentX = ctx.parentX + (ctx.branchIndex % 2 === 0 ? 150 : -150);
        // Reset lastBranchNode to the fork node so new branch lines link from it
        ctx.lastBranchNode = ctx.forkStart;
        return;
      }
  
      if (line.startsWith("end fork")) {
        // Finish the fork block: record the last branch
        let ctx = contextStack.pop();
        ctx.branchEnds.push(ctx.lastBranchNode || ctx.forkStart);
        // We do create a "Merge Fork" node to unify the parallel threads
        const mergeNode = createNode("Merge Fork", "rectangle");
        // Link each branch end to the merge node
        ctx.branchEnds.forEach((branchEnd) => {
          if (branchEnd) linkNodes(branchEnd, mergeNode);
        });
        // Restore the x position.
        currentX = xStack.pop();
        return;
      }
  
      // (You could add more parsing rules here if needed.)
    });
  
    return { nodes, edges };
  }