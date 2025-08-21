// Cache để lưu trữ kết quả đã phân tích
const analyticsCache = {};

// Hàm định dạng giá trị USD
function formatUSDValue(usdValueNum) {
  if (!Number.isFinite(usdValueNum) || usdValueNum <= 0) return "N/A";
  return usdValueNum.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 8, // giữ tối đa 8 số sau dấu phẩy
  });
}

// Hàm fetch với timeout
function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000 } = options; // 8 giây
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  return fetch(resource, {
    ...options,
    signal: controller.signal,
  }).finally(() => clearTimeout(id));
}

// Handle Enter key inside input
function handleEnter() {
  const q = document.getElementById("checkInput").value.trim();
  if (!q) return;

  const logoContainer = document.getElementById("logoContainer");
  const analyticsResults = document.getElementById("analyticsResults");
  const walletAddressInline = document.getElementById("walletAddressInline");
  const analyticsDataInline = document.getElementById("analyticsDataInline");

  // overlay elements
  const overlay = document.getElementById("txOverlay");
  const overlayBody = document.getElementById("txOverlayBody");
  const closeOverlayBtn = document.getElementById("closeOverlayBtn");

  // 🔹 reset overlay mỗi lần tìm mới
  if (overlay) {
    overlay.style.display = "none"; // đóng overlay nếu đang mở
    overlayBody.innerHTML = ""; // xóa nội dung cũ
  }

  // show panel
  logoContainer.style.display = "none";
  analyticsResults.style.display = "block";

  analyticsResults.classList.add("loading");
  analyticsDataInline.innerHTML = 'Loading<span class="loading-dots"></span>';

  // check txid format
  const isTxid = /^[0-9a-fA-F]{64}$/.test(q);

  function displayBTCPrice() {
    if (btcPriceUSD !== null) {
      const btcPriceElem = document.getElementById("btcPriceInline");
      if (btcPriceElem) {
        btcPriceElem.innerText = `BTC Price: $${btcPriceUSD.toLocaleString(
          "en-US",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )} USD`;
      }
    }
  }

  if (isTxid) {
    // ========= TRANSACTION =========
    fetchWithTimeout(`https://mempool.space/api/tx/${q}`, { timeout: 8000 })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((tx) => {
        walletAddressInline.innerText =
          "Transaction: " + q.substring(0, 16) + "...";

        // tổng output
        const totalOutSats = tx.vout.reduce(
          (sum, v) => sum + (v.value || 0),
          0
        );
        const totalOutBTC = totalOutSats / 1e8;

        // USD value
        let usdValue = "N/A";
        if (btcPriceUSD !== null) {
          usdValue = (totalOutBTC * btcPriceUSD).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        }

        // thông tin cơ bản
        analyticsDataInline.innerHTML = `
          <ul>
            <li>Confirmations:
              <span style="color:${
                tx.status?.confirmed ? "green" : "red"
              }; font-weight:bold;">
                ${tx.status?.confirmed ? "Confirmed" : "Unconfirmed"}
              </span>
            </li>
            <li>Block Height: ${tx.status?.block_height ?? "N/A"}</li>
            <li>Total Output: ${totalOutBTC.toFixed(8)} BTC</li>
            <li>USD Value: $${usdValue}</li>
            <li id="btcPriceInline"></li>
          </ul>
          <button id="showDetailsBtn" class="pill" style="margin-top:8px;cursor:pointer;">Show Ins/Outs</button>
        `;

        // build Inputs (table rows)
        const inputsRows = (tx.vin || [])
          .map((vin, i) => {
            if (vin.is_coinbase || vin.coinbase || !vin.prevout) {
              return `<tr><td>[${i}]</td><td colspan="2">Coinbase</td></tr>`;
            }
            const addr = vin.prevout.scriptpubkey_address || "Unknown";
            const valBTC = ((vin.prevout.value || 0) / 1e8).toFixed(8);
            return `
      <tr>
        <td>[${i}]</td>
        <td>${valBTC} BTC</td>
        <td class="addr-cell">${addr}</td>
      </tr>
    `;
          })
          .join("");

        // build Outputs (table rows)
        const outputsRows = (tx.vout || [])
          .map((vout, i) => {
            const addr = vout.scriptpubkey_address || "Unknown";
            const valBTC = ((vout.value || 0) / 1e8).toFixed(8);
            return `
      <tr>
        <td>[${i}]</td>
        <td>${valBTC} BTC</td>
        <td class="addr-cell">${addr}</td>
      </tr>
    `;
          })
          .join("");

        overlayBody.innerHTML = `
  <h3>Transaction Details</h3>
  <div class="tx-tabs">
    <button id="tabInputs" class="tab-btn active">Inputs (${
      (tx.vin || []).length
    })</button>
    <button id="tabOutputs" class="tab-btn">Outputs (${
      (tx.vout || []).length
    })</button>
  </div>

  <div id="inputsSection" class="tab-section">
    <div class="table-wrapper">
      <table class="tx-table">
        <thead>
          <tr><th>#</th><th>Value</th><th>Address</th></tr>
        </thead>
        <tbody>${inputsRows || "<tr><td colspan='3'>None</td></tr>"}</tbody>
      </table>
    </div>
  </div>

  <div id="outputsSection" class="tab-section" style="display:none;">
    <div class="table-wrapper">
      <table class="tx-table">
        <thead>
          <tr><th>#</th><th>Value</th><th>Address</th></tr>
        </thead>
        <tbody>${outputsRows || "<tr><td colspan='3'>None</td></tr>"}</tbody>
      </table>
    </div>
  </div>
`;

        // Gắn sự kiện cho tab
        const tabInputs = document.getElementById("tabInputs");
        const tabOutputs = document.getElementById("tabOutputs");
        const inputsSection = document.getElementById("inputsSection");
        const outputsSection = document.getElementById("outputsSection");

        tabInputs.addEventListener("click", () => {
          tabInputs.classList.add("active");
          tabOutputs.classList.remove("active");
          inputsSection.style.display = "block";
          outputsSection.style.display = "none";
        });

        tabOutputs.addEventListener("click", () => {
          tabOutputs.classList.add("active");
          tabInputs.classList.remove("active");
          outputsSection.style.display = "block";
          inputsSection.style.display = "none";
        });

        // bind nút Show Details
        const showBtn = document.getElementById("showDetailsBtn");
        if (showBtn) {
          showBtn.onclick = () => {
            overlay.style.display = "flex";
          };
        }

        // bind nút close overlay
        if (closeOverlayBtn) {
          closeOverlayBtn.onclick = () => {
            overlay.style.display = "none";
          };
        }

        displayBTCPrice();
        analyticsResults.classList.remove("loading");
      })
      .catch((err) => {
        analyticsDataInline.innerHTML = `<span style="color:#ff6b6b">Error loading TX</span>`;
        analyticsResults.classList.remove("loading");
        console.error("TX fetch error:", err);
      });
  } else {
    // ========= ADDRESS =========
    fetchWithTimeout(`https://mempool.space/api/address/${q}`, {
      timeout: 8000,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((addr) => {
        walletAddressInline.innerText =
          "Address: " + q.substring(0, 20) + "...";

        const balanceSats =
          (addr.chain_stats?.funded_txo_sum || 0) -
          (addr.chain_stats?.spent_txo_sum || 0);
        const balanceBTC = balanceSats / 1e8;

        let usdValue = "N/A";
        if (btcPriceUSD !== null) {
          usdValue = (balanceBTC * btcPriceUSD).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });
        }

        analyticsDataInline.innerHTML = `
          <ul>
            <li>Balance: ${balanceBTC.toFixed(8)} BTC</li>
            <li>USD Value: $${usdValue}</li>
            <li>Transactions: ${addr.chain_stats?.tx_count ?? 0}</li>
            <li id="btcPriceInline"></li>
          </ul>
        `;

        displayBTCPrice();
        analyticsResults.classList.remove("loading");
      })
      .catch((err) => {
        analyticsDataInline.innerHTML = `<span style="color:#ff6b6b">Error loading Address</span>`;
        analyticsResults.classList.remove("loading");
        console.error("Address fetch error:", err);
      });
  }
}

function closeAnalytics() {
  const logoContainer = document.getElementById("logoContainer");
  const analyticsResults = document.getElementById("analyticsResults");

  logoContainer.style.display = "flex";
  analyticsResults.style.display = "none";
}

// =========================
// Close results button
document
  .getElementById("closeResultsBtn")
  ?.addEventListener("click", closeAnalytics);

// =========================
// Fade-in observer
document.addEventListener("DOMContentLoaded", () => {
  const fadeElements = document.querySelectorAll(".fade-in");

  const fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.15 }
  );
  fadeElements.forEach((el) => fadeObserver.observe(el));
});

// =========================
//  Giá BTC từ mempool.space
// =========================
let btcPriceUSD = null;

async function fetchBTCPrice() {
  try {
    const res = await fetch("https://mempool.space/api/v1/prices");
    const data = await res.json();
    if (data && typeof data.USD === "number") {
      btcPriceUSD = data.USD;
    }
  } catch (err) {
    console.error("Error fetching BTC price from mempool:", err);
  }
}

// ====================================
//  Format amount: BTC / mBTC / µBTC / sat
// ====================================
function formatBTCAmount(btc) {
  // Chuẩn hóa: nếu số âm/NaN, trả về 0 sat
  if (!Number.isFinite(btc) || btc <= 0) {
    return { value: "0", unit: "sat" };
  }

  if (btc >= 0.01) {
    // Hiển thị theo BTC khi >= 0.01 BTC
    return { value: btc.toFixed(4), unit: "BTC" };
  } else if (btc >= 0.001) {
    // 0.001 BTC -> 1.00 mBTC
    return { value: (btc * 1e3).toFixed(2), unit: "mBTC" };
  } else if (btc >= 0.000001) {
    // 0.000001 BTC -> 1.00 µBTC
    return { value: (btc * 1e6).toFixed(2), unit: "µBTC" };
  } else {
    // Rất nhỏ -> satoshi
    // Làm tròn về integer để tránh hiển thị 0 sat khi có giá trị rất nhỏ
    const sats = Math.max(1, Math.round(btc * 1e8));
    return { value: String(sats), unit: "sat" };
  }
}

// ===========================
//  Fetch danh sách mempool
// ===========================
let isUpdating = false;
let lastTxIds = [];

async function fetchMempoolTransactions() {
  if (isUpdating) return;
  isUpdating = true;

  try {
    const res = await fetch("https://mempool.space/api/mempool/recent");
    const data = await res.json();

    // Kiểm tra xem có thay đổi không
    const newTxIds = data.slice(0, 10).map((tx) => tx.txid);
    const hasChanged = JSON.stringify(newTxIds) !== JSON.stringify(lastTxIds);

    if (!hasChanged) {
      isUpdating = false;
      return; // Không update nếu data không đổi
    }

    lastTxIds = newTxIds;
    const tbody = document.getElementById("tx-table");
    if (!tbody) {
      isUpdating = false;
      return;
    }

    tbody.innerHTML = "";

    data.slice(0, 10).forEach((tx) => {
      const row = document.createElement("tr");

      // TXID (shortened)
      const txCell = document.createElement("td");
      const txLink = document.createElement("a");
      txLink.href = `https://mempool.space/tx/${tx.txid}`;
      txLink.target = "_blank";
      txLink.textContent =
        tx.txid.substring(0, 4) + "..." + tx.txid.substring(tx.txid.length - 4);
      txCell.appendChild(txLink);

      // Amount (BTC / mBTC / µBTC / sat)
      const amountCell = document.createElement("td");
      const btcAmountNum = tx.value / 1e8; // giữ dạng số để tính tiếp
      const fmt = formatBTCAmount(btcAmountNum);
      amountCell.innerHTML = `${fmt.value} <span style="color:#999">${fmt.unit}</span>`;

      // USD value (tính từ số gốc, không phải chuỗi đã format)
      const usdCell = document.createElement("td");
      if (btcPriceUSD === null) {
        usdCell.textContent = "Loading...";
      } else {
        const usdValueNum = btcAmountNum * btcPriceUSD;
        usdCell.textContent = formatUSDValue(usdValueNum);
      }

      // Fee in sat/vB
      const feeCell = document.createElement("td");
      const feeRate = (tx.fee / tx.vsize).toFixed(1);
      feeCell.innerHTML = `${feeRate} <span style="color:#999">sat/vB</span>`;

      row.appendChild(txCell);
      row.appendChild(amountCell);
      row.appendChild(usdCell);
      row.appendChild(feeCell);

      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Error fetching mempool data:", err);
    const tbody = document.getElementById("tx-table");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: #ff6b6b;">Error loading data</td></tr>`;
    }
  } finally {
    isUpdating = false;
  }
}

// ===========================
//  Scroll Toggle (Down <-> Up)
// ===========================
const scrollToggleBtn = document.getElementById("scrollToggleBtn");
const scrollIcon = document.getElementById("scrollIcon");
const scrollText = document.getElementById("scrollText");

function updateScrollBtn() {
  if (!scrollToggleBtn || !scrollIcon || !scrollText) return;

  const nearTop = window.scrollY < 100;

  if (nearTop) {
    scrollText.textContent = "Scroll Down";
    scrollIcon.textContent = "↓";
    scrollToggleBtn.dataset.mode = "down";
  } else {
    scrollText.textContent = "Scroll Up";
    scrollIcon.textContent = "↑";
    scrollToggleBtn.dataset.mode = "up";
  }
}

scrollToggleBtn?.addEventListener("click", () => {
  if (scrollToggleBtn.dataset.mode === "down") {
    // Scroll xuống phần content-grid
    const nextSection = document.querySelector(".content-grid");
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: "smooth" });
    }
  } else {
    // Scroll lên đầu
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// Cập nhật khi scroll
window.addEventListener("scroll", updateScrollBtn);
updateScrollBtn();

// ===========================
//  Khởi động khi DOM ready
// ===========================
document.addEventListener("DOMContentLoaded", () => {
  // Lấy tỷ giá BTC ban đầu (đồng bộ nguồn với mempool.space)
  fetchBTCPrice();

  // Cập nhật tỷ giá mỗi 60 giây (đủ mượt mà, tránh spam)
  setInterval(fetchBTCPrice, 60000);

  // Chạy lần đầu
  fetchMempoolTransactions();

  // Update mempool mỗi 3 giây
  setInterval(fetchMempoolTransactions, 3000);

  // Toggle chi tiết giao dịch
  const toggleBtn = document.getElementById("toggleDetailsBtn");
  const txDetails = document.getElementById("txDetails");

  if (toggleBtn && txDetails) {
    toggleBtn.addEventListener("click", () => {
      if (
        txDetails.style.display === "none" ||
        txDetails.style.display === ""
      ) {
        txDetails.style.display = "block";
        toggleBtn.textContent = "Hide Details";
      } else {
        txDetails.style.display = "none";
        toggleBtn.textContent = "Show Details";
      }
    });
  }
});
