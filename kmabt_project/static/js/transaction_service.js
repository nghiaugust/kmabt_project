// transactionService.js - Xử lý phân tích giao dịch
const TransactionService = {
    analyticsCache: {},

    // Phân tích transaction
    async analyzeTransaction(txid) {
        const walletAddressInline = document.getElementById("walletAddressInline");
        const analyticsDataInline = document.getElementById("analyticsDataInline");
        
        try {
            const res = await Utils.fetchWithTimeout(`https://mempool.space/api/tx/${txid}`, { timeout: 8000 });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const tx = await res.json();
            
            walletAddressInline.innerText = "Transaction: " + txid.substring(0, 16) + "...";

            // Tổng output
            const totalOutSats = tx.vout.reduce((sum, v) => sum + (v.value || 0), 0);
            const totalOutBTC = totalOutSats / 1e8;

            // USD value
            let usdValue = "N/A";
            if (PriceService.btcPriceUSD !== null) {
                usdValue = (totalOutBTC * PriceService.btcPriceUSD).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
            }

            // Hiển thị thông tin cơ bản
            analyticsDataInline.innerHTML = `
                <ul>
                    <li>Confirmations:
                        <span style="color:${
                          tx.status?.confirmed ? "green" : "red"
                        }; font-weight:bold;">
                            ${
                              tx.status?.confirmed ? "Confirmed" : "Unconfirmed"
                            }
                        </span>
                    </li>
                    <li>Block Height: ${tx.status?.block_height ?? "N/A"}</li>
                    <li>Total Output: ${totalOutBTC.toFixed(8)} BTC</li>
                    <li>USD Value: $${usdValue}</li>
                    <li id="btcPriceInline"></li>
                </ul>
                <button id="showDetailsBtn" class="show-btn">Show Ins/Outs</button>
            `;

            // Thiết lập overlay cho chi tiết giao dịch
            this.setupTransactionOverlay(tx);
            PriceService.displayBTCPrice();

        } catch (err) {
            analyticsDataInline.innerHTML = `<span style="color:#ff6b6b">Error loading TX</span>`;
            console.error("TX fetch error:", err);
        }
    },

    // Thiết lập overlay hiển thị chi tiết inputs/outputs
    setupTransactionOverlay(tx) {
        const overlay = document.getElementById("txOverlay");
        const overlayBody = document.getElementById("txOverlayBody");
        const closeOverlayBtn = document.getElementById("closeOverlayBtn");

        if (!overlay || !overlayBody) return;

        // Build Inputs table rows
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

        // Build Outputs table rows
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
                <button id="tabInputs" class="tab-btn active">Inputs (${(tx.vin || []).length})</button>
                <button id="tabOutputs" class="tab-btn">Outputs (${(tx.vout || []).length})</button>
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

        // Gắn sự kiện cho tabs
        this.setupTabs();
        this.bindOverlayEvents(overlay, closeOverlayBtn);
    },

    // Thiết lập tabs cho inputs/outputs
    setupTabs() {
        const tabInputs = document.getElementById("tabInputs");
        const tabOutputs = document.getElementById("tabOutputs");
        const inputsSection = document.getElementById("inputsSection");
        const outputsSection = document.getElementById("outputsSection");

        if (!tabInputs || !tabOutputs) return;

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
    },

    // Bind events cho overlay
    bindOverlayEvents(overlay, closeOverlayBtn) {
        // Bind nút Show Details
        const showBtn = document.getElementById("showDetailsBtn");
        if (showBtn) {
            showBtn.onclick = () => {
                overlay.style.display = "flex";
            };
        }

        // Bind nút close overlay
        if (closeOverlayBtn) {
            closeOverlayBtn.onclick = () => {
                overlay.style.display = "none";
            };
        }
    }
};

// Export
window.TransactionService = TransactionService;