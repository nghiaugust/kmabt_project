// Graph page logic extracted from graph.html into a static script
// Endpoints
const GRAPH_DATA_URL = "/graph_data/";
const EXPAND_NODE_URL = "/expand_node/";

let cy;
let isLoading = false;
// When true, after an expand we auto-dim everything except the expanded subgraph
const TRACE_FOCUS_ON_EXPAND = true;

// Initialize Cytoscape
function initGraph() {
  cy = cytoscape({
    container: document.getElementById("cy"),
    elements: [],
    style: [
      {
        selector: 'node[type="address"]',
        style: {
          "background-color": "#2a2d3a",
          label: "data(label)",
          color: "#ffffff",
          "font-size": "11px",
          "font-family": "Arial, sans-serif",
          "text-valign": "center",
          "text-halign": "center",
          "text-outline-width": 0,
          width: "160px",
          height: "60px",
          shape: "round-rectangle",
          "border-width": 1,
          "border-color": "#3d4050",
          "background-opacity": 1,
          "text-max-width": "150px",
          "text-wrap": "wrap",
          padding: "5px",
          "compound-sizing-wrt-labels": "include",
          "background-image":
            'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"%3E%3Cpath d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 4L13.5 7.5C13.1 8.5 12.6 8.9 11.5 8.5L10.5 8L9 10.5V12.5H7V14.5H9V16.5L10.5 19H13.5L15 16.5V14.5H17V12.5H15V10.5L16.5 8L21 9Z"/%3E%3C/svg%3E',
          "background-image-opacity": 0.3,
          "background-width": "24px",
          "background-height": "24px",
          "background-position-x": "12px",
          "background-position-y": "18px",
        },
      },
      {
        selector: 'node[type="exchange"]',
        style: {
          "background-color": "#4a5568",
          label: "data(label)",
          color: "#ffffff",
          "font-size": "11px",
          "font-family": "Arial, sans-serif",
          "text-valign": "center",
          "text-halign": "center",
          "text-outline-width": 0,
          width: "160px",
          height: "60px",
          shape: "round-rectangle",
          "border-width": 1,
          "border-color": "#5a6174",
          "background-opacity": 1,
          "text-max-width": "150px",
          "text-wrap": "wrap",
          "background-image":
            'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"%3E%3Cpath d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 4L13.5 7.5C13.1 8.5 12.6 8.9 11.5 8.5L10.5 8L9 10.5V12.5H7V14.5H9V16.5L10.5 19H13.5L15 16.5V14.5H17V12.5H15V10.5L16.5 8L21 9Z"/%3E%3C/svg%3E',
          "background-image-opacity": 0.4,
          "background-width": "24px",
          "background-height": "24px",
          "background-position-x": "12px",
          "background-position-y": "18px",
        },
      },
      {
        selector: 'node[type="special"]',
        style: {
          "background-color": "#6b46c1",
          label: "data(label)",
          color: "#ffffff",
          "font-size": "11px",
          "font-family": "Arial, sans-serif",
          "text-valign": "center",
          "text-halign": "center",
          "text-outline-width": 0,
          width: "160px",
          height: "60px",
          shape: "round-rectangle",
          "border-width": 1,
          "border-color": "#7c3aed",
          "background-opacity": 1,
          "text-max-width": "150px",
          "text-wrap": "wrap",
          "background-image":
            'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"%3E%3Cpath d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 4L13.5 7.5C13.1 8.5 12.6 8.9 11.5 8.5L10.5 8L9 10.5V12.5H7V14.5H9V16.5L10.5 19H13.5L15 16.5V14.5H17V12.5H15V10.5L16.5 8L21 9Z"/%3E%3C/svg%3E',
          "background-image-opacity": 0.4,
          "background-width": "24px",
          "background-height": "24px",
          "background-position-x": "12px",
          "background-position-y": "18px",
        },
      },
      {
        selector: "edge",
        style: {
          width: 2,
          "line-color": "#4a5568",
          "target-arrow-color": "#4a5568",
          "target-arrow-shape": "triangle",
          "target-arrow-size": "10px",
          "curve-style": "bezier",
          label: "data(amount)",
          "font-size": "10px",
          color: "#a0aec0",
          "text-background-color": "rgba(0,0,0,0.8)",
          "text-background-opacity": 0.8,
          "text-background-padding": "3px",
          "edge-text-rotation": "none",
          "text-margin-y": "-15px",
          "text-opacity": 0,
        },
      },
      {
        selector: "edge:selected",
        style: {
          "line-color": "#63b3ed",
          "target-arrow-color": "#63b3ed",
          width: 2,
          color: "#ffffff",
        },
      },
      {
        selector: "node.highlighted",
        style: {
          "border-width": 3,
          "border-color": "#42a5f5",
          "background-opacity": 1,
        },
      },
      {
        selector: "node.dimmed",
        style: {
          opacity: 0.3,
        },
      },
      {
        selector: "edge.highlighted",
        style: {
          width: 4,
          "line-color": "#42a5f5",
          "target-arrow-color": "#42a5f5",
          opacity: 1,
          "text-opacity": 1,
        },
      },
      {
        selector: "edge.hovered",
        style: {
          "text-opacity": 1,
          width: 3,
        },
      },
      {
        selector: "edge.dimmed",
        style: {
          opacity: 0.2,
        },
      },
      {
        selector: "node.cy-node-expanded",
        style: {
          "border-width": 4,
          "border-color": "#4ade80",
          "background-blacken": -0.2,
        },
      },
      {
        selector: "edge.cy-edge-expanded",
        style: {
          width: 4,
          "line-color": "#4ade80",
          "target-arrow-color": "#4ade80",
          opacity: 1,
          "text-opacity": 1,
        },
      },
      {
        selector: "node.key-node",
        style: {
          "border-width": 4,
          "border-color": "#f59e0b",
          "background-blacken": -0.1,
        },
      },
      {
        selector: "edge.key-edge",
        style: {
          width: 3,
          "line-color": "#f59e0b",
          "target-arrow-color": "#f59e0b",
          "text-opacity": 1,
        },
      },
      {
        selector: "node:selected",
        style: {
          "border-color": "#63b3ed",
          "border-width": 2,
        },
      },
    ],
    layout: {
      name: "breadthfirst",
      directed: true,
      spacingFactor: 1.2,
      animate: true,
      animationDuration: 800,
      fit: true,
      padding: 100,
      transform: function (node, position) {
        // Swap axes to achieve left-to-right layout (instead of top-down)
        return { x: position.y, y: position.x };
      },
    },
  });

  // Node click
  cy.on("tap", "node", function (evt) {
    hideContextMenu();
    const node = evt.target;
    const nodeData = node.data();
    let info = `<strong>${
      nodeData.type === "address" ? "Address" : "Transaction"
    } Details</strong><br>`;
    info += `<strong>ID:</strong> ${nodeData.id}<br>`;
    info += `<strong>Label:</strong> ${nodeData.label}<br>`;
    if (nodeData.type === "address") {
      info += `<strong>Type:</strong> Bitcoin Address<br>`;
      info += `<strong>Balance:</strong> ${nodeData.balance || "Unknown"}<br>`;
      if (nodeData.expandable) {
        info += `<br><button onclick="expandNodeById('${nodeData.id}')" class="btn btn-sm" style="background: #42a5f5; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Expand node</button>`;
      }
    } else {
      info += `<strong>Type:</strong> Transaction<br>`;
      info += `<strong>Amount:</strong> ${nodeData.amount || "Unknown"}<br>`;
    }
    document.getElementById("nodeInfo").innerHTML = info;
  });

  // Right-click context menu
  cy.on("cxttap", "node", function (evt) {
    evt.preventDefault();
    const nodeData = evt.target.data();
    window.selectedNode = nodeData;
    const contextMenu = document.getElementById("contextMenu");
    contextMenu.style.display = "block";
    contextMenu.style.left = evt.originalEvent.pageX + "px";
    contextMenu.style.top = evt.originalEvent.pageY + "px";
    const expandItem = contextMenu.querySelector(".context-menu-item");
    if (nodeData.expandable !== false) expandItem.classList.remove("disabled");
    else expandItem.classList.add("disabled");
  });

  // Edge hover events reveal labels
  cy.on("mouseover", "edge", function (evt) {
    evt.target.addClass("hovered");
  });
  cy.on("mouseout", "edge", function (evt) {
    evt.target.removeClass("hovered");
  });

  // Click elsewhere hides context menu
  cy.on("tap", function (evt) {
    if (evt.target === cy) hideContextMenu();
  });

  // Edge tap info
  cy.on("tap", "edge", function (evt) {
    hideContextMenu();
    const edgeData = evt.target.data();
    let info = `<strong>Transaction Flow</strong><br>`;
    info += `<strong>From:</strong> ${edgeData.source}<br>`;
    info += `<strong>To:</strong> ${edgeData.target}<br>`;
    info += `<strong>Amount:</strong> ${edgeData.amount || "Unknown"}<br>`;
    if (edgeData.time) info += `<strong>Time:</strong> ${edgeData.time}<br>`;
    if (edgeData.tx_hash)
      info += `<strong>TX Hash:</strong> ${edgeData.tx_hash}...<br>`;
    document.getElementById("nodeInfo").innerHTML = info;
  });
}

// Context menu helpers
let selectedNode = null;
function hideContextMenu() {
  document.getElementById("contextMenu").style.display = "none";
}
function expandNode() {
  if (!window.selectedNode) return;
  expandNodeById(window.selectedNode.id);
  hideContextMenu();
}

function expandNodeById(nodeId) {
  const node = cy.getElementById(nodeId);
  const nodeData = node.data();
  const address = nodeData.full_address || nodeData.id;
  const existingAddresses = cy
    .nodes()
    .map((n) => n.data().full_address || n.data().id)
    .filter(Boolean);

  document.getElementById("loadingOverlay").style.display = "flex";
  fetch(
    `${EXPAND_NODE_URL}?address=${encodeURIComponent(
      address
    )}&existing_addresses=${encodeURIComponent(existingAddresses.join(","))}`
  )
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      document.getElementById("loadingOverlay").style.display = "none";
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      if (data.nodes && data.edges) {
        cy.add(data.nodes);
        cy.add(data.edges);
        const newNodeIds = (data.nodes || [])
          .map((n) => n.data && n.data.id)
          .filter(Boolean);
        // Smarter placement for readability and tracing
        positionExpandedNodesSmart(nodeId, newNodeIds, data.edges || []);
        data.nodes.forEach((nd) => {
          cy.getElementById(nd.data.id).addClass("cy-node-expanded");
        });
        data.edges.forEach((ed) => {
          cy.getElementById(ed.data.id).addClass("cy-edge-expanded");
        });
        // Focus and fit the expanded subgraph
        const subgraph = cy
          .collection([node])
          .union(newNodeIds.map((id) => cy.getElementById(id)))
          .union((data.edges || []).map((e) => cy.getElementById(e.data.id)));
        if (TRACE_FOCUS_ON_EXPAND) focusSubgraph(subgraph);
        cy.animate(
          { fit: { eles: subgraph, padding: 120 } },
          { duration: 600 }
        );
        updateStats();
        alert(`Success! ${data.message || "Node expanded."}`);
        document.getElementById("nodeInfo").innerHTML = `
          <strong>Expansion successful</strong><br>
          ${data.message || ""}<br>
          <span style="opacity: 0.7; font-size: 12px;">Added ${
            data.nodes.length
          } nodes and ${data.edges.length} new connections.</span>
        `;
      } else {
        alert("No new data to display");
      }
    })
    .catch((error) => {
      document.getElementById("loadingOverlay").style.display = "none";
      console.error("Error expanding node:", error);
      document.getElementById("nodeInfo").innerHTML = `
        <strong>Connection error</strong><br>
        <span style="opacity: 0.7;">Unable to expand the node. Please try again.</span>
      `;
    });
}

function copyAddress() {
  if (!window.selectedNode) return;
  const address = window.selectedNode.full_address || window.selectedNode.id;
  navigator.clipboard.writeText(address).then(() => {
    alert("Address copied: " + address);
  });
  hideContextMenu();
}

function viewOnExplorer() {
  if (!window.selectedNode) return;
  const address = window.selectedNode.full_address || window.selectedNode.id;
  window.open(`https://blockstream.info/address/${address}`, "_blank");
  hideContextMenu();
}

function highlightConnections() {
  if (!window.selectedNode) return;
  const nodeId = window.selectedNode.id;
  cy.elements().removeClass("highlighted dimmed");
  const connected = cy
    .getElementById(nodeId)
    .neighborhood()
    .add(cy.getElementById(nodeId));
  connected.addClass("highlighted");
  cy.elements().difference(connected).addClass("dimmed");
  hideContextMenu();
}

// Global click hides context menu
document.addEventListener("click", function (event) {
  if (!event.target.closest("#contextMenu")) hideContextMenu();
});

// Data loading
function loadSampleData() {
  if (isLoading) return;
  isLoading = true;
  document.getElementById("nodeInfo").innerHTML =
    '<div class="loading">Loading blockchain data...</div>';
  fetch(GRAPH_DATA_URL)
    .then((r) => r.json())
    .then((data) => {
      cy.elements().remove();
      cy.add(data.nodes);
      cy.add(data.edges);
      markImportant();
      const roots = computeRoots();
      applyLayoutLTR(true, roots);
      focusImportant();
      updateStats();
      document.getElementById("nodeInfo").innerHTML = `
        <strong>Sample data loaded</strong><br>
        <span style="opacity: 0.7;">Showing ${data.nodes.length} nodes and ${data.edges.length} edges. Click on elements for details.</span>
      `;
      isLoading = false;
    })
    .catch((err) => {
      console.error("Error:", err);
      document.getElementById("nodeInfo").innerHTML =
        '<strong style="color: #f44336;">Error loading data</strong>';
      isLoading = false;
    });
}

function analyzeAddress() {
  searchRealBitcoin();
}

function searchRealBitcoin() {
  const address = document.getElementById("searchInput").value.trim();
  if (!address) {
    alert("Please enter a Bitcoin address.");
    return;
  }
  const isValidAddress =
    /^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})$/.test(
      address
    );
  if (!isValidAddress) {
    alert(
      "Invalid Bitcoin address!\nSupported: \n- Legacy (1...)\n- P2SH (3...)\n- Bech32 (bc1...)"
    );
    return;
  }
  document.getElementById("nodeInfo").innerHTML = `
    <strong>Searching...</strong><br>
    <span style="opacity: 0.7;">Querying the blockchain for address: ${address.substring(
      0,
      15
    )}...</span><br>
    <div style="margin-top: 10px;">
      <div class="loading-spinner" style="display: inline-block; width: 20px; height: 20px; border: 2px solid #333; border-top: 2px solid #42a5f5; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span style="margin-left: 10px;">Connecting to API...</span>
    </div>`;
  cy.elements().remove();
  fetch(`${GRAPH_DATA_URL}?address=${encodeURIComponent(address)}`)
    .then((r) => r.json())
    .then((data) => {
      if (data.search_info) {
        cy.add(data.nodes);
        cy.add(data.edges);
        markImportant(address);
        applyLayoutLTR(true, [address]);
        focusImportant();
        updateStats();
        const info = data.search_info;
        document.getElementById("nodeInfo").innerHTML = `
          <strong>Bitcoin Address Info</strong><br>
          <strong>Address:</strong> ${info.address.substring(0, 12)}...<br>
          <strong>Current balance:</strong> ${info.balance.toFixed(8)} BTC<br>
          <strong>Total received:</strong> ${info.total_received.toFixed(
            8
          )} BTC<br>
          <strong>Total sent:</strong> ${info.total_sent.toFixed(8)} BTC<br>
          <strong>Transactions:</strong> ${info.n_tx}<br>
          <strong>Unconfirmed balance:</strong> ${info.unconfirmed_balance.toFixed(
            8
          )} BTC<br>
          <strong>API:</strong> ${info.api_source}<br>
          <hr style=\"border-color: rgba(255,255,255,0.2);\">
          <span style=\"opacity: 0.7; font-size: 12px;\">Real Bitcoin blockchain data</span>`;
      } else {
        document.getElementById("nodeInfo").innerHTML = `
          <strong>No data found</strong><br>
          <span style="opacity: 0.7;">Address not found or no transactions yet.<br>Check console for API error details.</span>`;
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      document.getElementById("nodeInfo").innerHTML = `
        <strong>Connection error</strong><br>
        <span style="opacity: 0.7;">Cannot connect to blockchain API. Please try again.<br>Details: ${error.message}</span>`;
    });
}

// function clearGraph() {
//   cy.elements().remove(); updateStats();
//   document.getElementById('nodeInfo').innerHTML = `
//     <strong>Transaction Graph Analysis</strong><br>
//     <span style="opacity: 0.7;">Graph cleared. Load sample data or analyze an address to begin.</span>`;
// }

function clearGraph() {
  // Giả sử biến chứa đồ thị của bạn tên là 'cy' và có thể truy cập toàn cục.
  if (typeof cy !== "undefined") {
    // Lệnh này sẽ chọn TẤT CẢ các elements (nodes và edges) và xóa chúng.
    cy.elements().remove();
    console.log("Graph data cleared successfully.");

    // (Rất nên làm) Reset các ô thống kê về 0.
    document.getElementById("nodeCount").textContent = "0";
    document.getElementById("edgeCount").textContent = "0";
    document.getElementById("totalValue").textContent = "$0";
    document.getElementById("exchangeCount").textContent = "0";

    // (Nên làm) Cập nhật lại ô thông tin chi tiết.
    const nodeInfoPanel = document.getElementById("nodeInfo");
    if (nodeInfoPanel) {
      nodeInfoPanel.innerHTML = `
                <strong>Transaction Graph Analysis</strong><br>
                <span style="opacity: 0.7;">Graph cleared. Enter an address to begin.</span>
            `;
    }
  } else {
    console.error('Cytoscape instance "cy" is not defined or accessible.');
  }
}

function fitGraph() {
  cy.fit();
}

function updateStats() {
  const nodes = cy.nodes();
  const edges = cy.edges();
  const exchanges = cy.nodes('[type="exchange"]');
  let totalValue = 0;
  edges.forEach((edge) => {
    const amount = edge.data("amount");
    if (amount) {
      const value = parseFloat(amount.replace(/[,$]/g, ""));
      if (!isNaN(value)) totalValue += value;
    }
  });
  document.getElementById("nodeCount").textContent = nodes.length;
  document.getElementById("edgeCount").textContent = edges.length;
  document.getElementById("totalValue").textContent =
    "$" + totalValue.toLocaleString();
  document.getElementById("exchangeCount").textContent = exchanges.length;
}

function zoomIn() {
  cy.zoom(cy.zoom() * 1.25);
  cy.center();
}
function zoomOut() {
  cy.zoom(cy.zoom() * 0.8);
  cy.center();
}
function centerGraph() {
  cy.center();
}

function highlightPath(sourceId, targetId) {
  cy.elements().removeClass("highlighted dimmed");
  const dijkstra = cy.elements().dijkstra("#" + sourceId, function () {
    return 1;
  });
  const pathTo = dijkstra.pathTo(cy.$("#" + targetId));
  if (pathTo.length > 0) {
    pathTo.addClass("highlighted");
    cy.elements().difference(pathTo).addClass("dimmed");
    document.getElementById("nodeInfo").innerHTML = `
      <strong>Highlighted path</strong><br>
      <strong>From:</strong> ${sourceId.substring(0, 12)}...<br>
      <strong>To:</strong> ${targetId.substring(0, 12)}...<br>
      <strong>Length:</strong> ${pathTo.nodes().length} nodes<br>
      <hr style="border-color: rgba(255,255,255,0.2);">
      <button onclick="clearHighlight()" style="background: #42a5f5; border: none; padding: 5px 10px; border-radius: 4px; color: white; cursor: pointer;">Clear highlight</button>`;
  } else {
    document.getElementById("nodeInfo").innerHTML = `
      <strong>No path found</strong><br>
      <span style="opacity: 0.7;">No direct connection between these nodes.</span>`;
  }
}

function clearHighlight() {
  cy.elements().removeClass("highlighted dimmed");
  document.getElementById("nodeInfo").innerHTML = `
    <strong>Transaction Graph Analysis</strong><br>
    <span style="opacity: 0.7;">Click a node to view details, right-click to expand.</span>`;
}

function focusNode(nodeId) {
  const node = cy.getElementById(nodeId);
  if (node.length > 0) {
    cy.animate({ center: { eles: node }, zoom: 2 }, { duration: 1000 });
    cy.elements().removeClass("highlighted dimmed");
    node.addClass("highlighted");
    node.neighborhood().addClass("highlighted");
    cy.elements()
      .difference(node.neighborhood().union(node))
      .addClass("dimmed");
  }
}

function applyLayoutLTR(fit, rootIds) {
  let rootsCollection = undefined;
  if (Array.isArray(rootIds) && rootIds.length) {
    const col = [];
    rootIds.forEach((id) => {
      const ele = cy.getElementById(id);
      if (ele && ele.length) col.push(ele);
    });
    if (col.length) rootsCollection = cy.collection(col);
  }
  cy.layout({
    name: "breadthfirst",
    directed: true,
    spacingFactor: 1.2,
    animate: true,
    animationDuration: 800,
    fit: !!fit,
    padding: 80,
    roots: rootsCollection,
    transform: function (node, position) {
      return { x: position.y, y: position.x };
    },
  }).run();
}

// Place new nodes left of source, split into two bands: outgoing above, incoming below
function positionExpandedNodesSmart(sourceId, nodeIds, newEdges) {
  const src = cy.getElementById(sourceId);
  if (!src || !src.length || !Array.isArray(nodeIds) || nodeIds.length === 0)
    return;
  const pos = src.position();
  const spacingX = 240; // horizontal step between columns
  const spacingY = 120; // vertical spacing between nodes

  // Build quick lookup for new nodes
  const newSet = new Set(nodeIds);
  // Classify nodes by direction relative to source
  const outgoing = new Set();
  const incoming = new Set();
  (newEdges || []).forEach((e) => {
    const s = e.data && e.data.source;
    const t = e.data && e.data.target;
    if (s === sourceId && newSet.has(t)) outgoing.add(t);
    if (t === sourceId && newSet.has(s)) incoming.add(s);
  });
  // Any nodes not captured fall back to outgoing band
  nodeIds.forEach((id) => {
    if (!outgoing.has(id) && !incoming.has(id)) outgoing.add(id);
  });

  const leftX = pos.x - spacingX; // left of source
  const upCenterY = pos.y - Math.max(0, outgoing.size - 1) * (spacingY / 2);
  const downCenterY = pos.y + Math.max(0, incoming.size - 1) * (spacingY / 2);

  cy.batch(() => {
    let i = 0;
    outgoing.forEach((id) => {
      const n = cy.getElementById(id);
      if (n && n.length) n.position({ x: leftX, y: upCenterY + i * spacingY });
      i += 1;
    });
    let j = 0;
    incoming.forEach((id) => {
      const n = cy.getElementById(id);
      if (n && n.length)
        n.position({ x: leftX - spacingX, y: downCenterY - j * spacingY });
      j += 1;
    });
  });
}

function computeRoots() {
  const roots = [];
  cy.nodes().forEach((n) => {
    if (n.indegree() === 0) roots.push(n.id());
  });
  return roots;
}

function markImportant(rootId) {
  cy.elements().removeClass("key-node key-edge");
  cy.nodes('[type = "exchange"]').addClass("key-node");
  if (rootId) {
    const root = cy.getElementById(rootId);
    if (root && root.length) root.addClass("key-node");
  }
  const keys = cy.nodes(".key-node");
  keys.forEach((kn) => {
    kn.connectedEdges().addClass("key-edge");
  });
}

function focusImportant() {
  cy.elements().removeClass("dimmed");
  cy.nodes().not(".key-node").addClass("dimmed");
  cy.edges().not(".key-edge").addClass("dimmed");
}
function resetFocus() {
  cy.elements().removeClass("dimmed");
}

// Focus a specific subgraph for tracing
function focusSubgraph(eles) {
  const all = cy.elements();
  all.removeClass("dimmed");
  const others = all.difference(eles);
  others.addClass("dimmed");
}

// Page bootstrapping
// document.addEventListener('DOMContentLoaded', function () {
//   initGraph();
//   updateStats();
//   setTimeout(loadSampleData, 500);

//   const input = document.getElementById('searchInput');
//   if (input) {
//     input.addEventListener('keypress', function (e) { if (e.key === 'Enter') analyzeAddress(); });
//   }
// });

// Page bootstrapping
document.addEventListener("DOMContentLoaded", function () {
  // --- Các bước khởi tạo ban đầu không đổi ---
  initGraph();
  updateStats();

  const input = document.getElementById("searchInput");
  if (input) {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") analyzeAddress();
    });
  }

  // --- Logic tự động tìm kiếm hoặc tải sample ---
  // Hàm tiện ích để lấy cookie
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2)
      return decodeURIComponent(parts.pop().split(";").shift());
  }

  const savedAddress = getCookie("bitcoinAddress");

  if (savedAddress && Utils.isBtcAddress(savedAddress)) {
    // TRƯỜNG HỢP 1: Cookie tồn tại và hợp lệ -> Tự động tìm kiếm
    console.log("Valid cookie found, auto-searching for:", savedAddress);

    input.value = savedAddress;
    searchRealBitcoin();

    // Xóa cookie sau khi đã sử dụng thành công
    document.cookie =
      "bitcoinAddress=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  } else {
    // TRƯỜNG HỢP 2: Không có cookie, hoặc cookie không hợp lệ

    // Nếu cookie tồn tại nhưng không hợp lệ, thông báo và đảm bảo nó đã bị xóa
    if (savedAddress) {
      console.warn(
        "Invalid Bitcoin address in cookie, clearing it and loading sample data."
      );
      document.cookie =
        "bitcoinAddress=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    } else {
      console.log("No cookie found, loading sample data.");
    }

    // Tải dữ liệu mẫu làm hành động mặc định
    setTimeout(loadSampleData, 500);
  }
});
