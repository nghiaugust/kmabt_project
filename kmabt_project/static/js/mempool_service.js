// mempoolService.js - Quản lý dữ liệu mempool
const MempoolService = {
    isUpdating: false,
    lastTxIds: [],

    // Lấy danh sách giao dịch mempool
    async fetchMempoolTransactions() {
        if (this.isUpdating) return;
        this.isUpdating = true;

        try {
            const res = await fetch("https://mempool.space/api/mempool/recent");
            const data = await res.json();

            // Kiểm tra xem có thay đổi không
            const newTxIds = data.slice(0, 10).map((tx) => tx.txid);
            const hasChanged = JSON.stringify(newTxIds) !== JSON.stringify(this.lastTxIds);

            if (!hasChanged) {
                this.isUpdating = false;
                return; // Không update nếu data không đổi
            }

            this.lastTxIds = newTxIds;
            this.updateMempoolTable(data.slice(0, 10));

        } catch (err) {
            console.error("Error fetching mempool data:", err);
            this.showMempoolError();
        } finally {
            this.isUpdating = false;
        }
    },

    // Cập nhật bảng mempool
    updateMempoolTable(transactions) {
        const tbody = document.getElementById("tx-table");
        if (!tbody) return;

        tbody.innerHTML = "";

        transactions.forEach((tx) => {
            const row = document.createElement("tr");

            // TXID (rút gọn)
            const txCell = document.createElement("td");
            const txLink = document.createElement("a");
            txLink.href = `https://mempool.space/tx/${tx.txid}`;
            txLink.target = "_blank";
            txLink.textContent = tx.txid.substring(0, 4) + "..." + tx.txid.substring(tx.txid.length - 4);
            txCell.appendChild(txLink);

            // Amount (BTC / mBTC / µBTC / sat)
            const amountCell = document.createElement("td");
            const btcAmountNum = tx.value / 1e8;
            const fmt = Utils.formatBTCAmount(btcAmountNum);
            amountCell.innerHTML = `${fmt.value} <span style="color:#999">${fmt.unit}</span>`;

            // USD value
            const usdCell = document.createElement("td");
            if (PriceService.btcPriceUSD === null) {
                usdCell.textContent = "Loading...";
            } else {
                const usdValueNum = btcAmountNum * PriceService.btcPriceUSD;
                usdCell.textContent = Utils.formatUSDValue(usdValueNum);
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
    },

    // Hiển thị lỗi mempool
    showMempoolError() {
        const tbody = document.getElementById("tx-table");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: #ff6b6b;">Error loading data</td></tr>`;
        }
    },

    // Khởi tạo mempool service
    init() {
        // Chạy lần đầu
        this.fetchMempoolTransactions();
        
        // Update mempool mỗi 3 giây
        setInterval(() => this.fetchMempoolTransactions(), 3000);
    }
};

// Export
window.MempoolService = MempoolService;