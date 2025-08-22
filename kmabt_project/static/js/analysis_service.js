/**
 * @file analysis_service_combined.js
 * @description Dịch vụ kết hợp để phân tích địa chỉ Bitcoin.
 * Lấy dữ liệu phân tích nội bộ từ API local và dữ liệu báo cáo từ nhiều API công khai của bên thứ ba.
 */

const AnalysisService = {
  // Dữ liệu cho báo cáo bên thứ ba (từ file 1)
  currentThirdPartyData: null,
  // Dữ liệu cho phân tích nội bộ (từ file 2)
  currentInternalData: null,
  // Địa chỉ đang được phân tích
  currentAddress: null,

  // --- CARD 1: PHÂN TÍCH NỘI BỘ (TỪ FILE 2) ---

  /**
   * Fetch và hiển thị dữ liệu cho card "Wallet Analysis" từ API nội bộ.
   * @param {string} address Địa chỉ Bitcoin để phân tích.
   */
  async fetchAndDisplayInternalAnalysis(address) {
    const analysisContent = document.getElementById('internal-analysis-content');
    const loadingIndicator = document.querySelector('#internal-analysis .analysis-loading');

    // Reset UI trước khi fetch
    analysisContent.innerHTML = `
        <div class="analysis-item">
            <div class="analysis-label">CoinJoin Detected</div>
            <div id="is-coinjoin" class="analysis-value">--</div>
        </div>
        <div class="analysis-item">
            <div class="analysis-label">Total Volume</div>
            <div id="total-volume" class="analysis-value">--</div>
        </div>
        <div class="analysis-item">
            <div class="analysis-label">CoinJoin Transactions</div>
            <div id="coinjoin-txs" class="analysis-value">--</div>
        </div>
        <div class="analysis-item" style="flex-direction: column; align-items: flex-start; gap: 5px;">
            <div class="analysis-label">Analysis Summary</div>
            <div id="analysis-message" class="analysis-value" style="font-size: 0.8em; white-space: normal; color: #bdc3c7;">--</div>
        </div>
        <div class="analysis-item">
            <div class="analysis-label">Max Depth</div>
            <div id="max-depth" class="analysis-value">--</div>
        </div>
    `;

    loadingIndicator.style.display = 'flex';
    analysisContent.style.display = 'none';

    try {
      const apiUrl = 'http://localhost:8005/investigate';
      const maxDepth = 5;
      const requestData = { address, max_depth: maxDepth };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Server responded with status ${response.status}` }));
        throw new Error(errorData.message || response.statusText);
      }

      const data = await response.json();
      this.currentInternalData = data; // Lưu dữ liệu để export

      // Cập nhật UI
      const isCoinjoinElement = document.getElementById('is-coinjoin');
      isCoinjoinElement.textContent = data.is_coinjoin ? 'Yes' : 'No';
      isCoinjoinElement.style.color = data.is_coinjoin ? '#ff9800' : '#4caf50';
      document.getElementById('total-volume').textContent = `${(data.total_volume || 0).toFixed(8)} BTC`;
      document.getElementById('coinjoin-txs').textContent = data.coinjoin_transactions?.length || 0;
      document.getElementById('analysis-message').textContent = data.message || 'No summary available.';
      document.getElementById('max-depth').textContent = maxDepth;

    } catch (error) {
      console.error('Lỗi khi fetch dữ liệu phân tích nội bộ:', error);
      analysisContent.innerHTML = `<div class="analysis-item" style="color: #f44336; justify-content: center;">Failed to load analysis: ${error.message}</div>`;
      this.currentInternalData = null;
    } finally {
      loadingIndicator.style.display = 'none';
      analysisContent.style.display = 'grid';
    }
  },

  // --- CARD 2: BÁO CÁO BÊN THỨ BA (LOGIC TỪ FILE 1) ---

  /**
   * Fetch và hiển thị dữ liệu cho card "Third-party Report".
   * Sử dụng logic fetch từ nhiều nguồn như trong file 1.
   * @param {string} address Địa chỉ Bitcoin để phân tích.
   */
  async fetchAndDisplayThirdPartyReport(address) {
    const reportContent = document.getElementById('report-content');
    const loadingIndicator = document.getElementById('report-loading');

    loadingIndicator.style.display = 'flex';
    reportContent.style.display = 'none';

    const cacheKey = `third-party-report-${address}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
        console.log("Đang tải báo cáo bên thứ ba từ cache...");
        this.currentThirdPartyData = JSON.parse(cachedData);
        this.displayThirdPartyReport(this.formatReportForDisplay(this.currentThirdPartyData));
        loadingIndicator.style.display = 'none';
        reportContent.style.display = 'block';
        return;
    }

    console.log("Đang fetch báo cáo mới từ các API bên thứ ba...");
    try {
        // Gọi đồng thời tất cả các API cần thiết từ file 1
        const [blockchainData, blockstreamData, btcPrice] = await Promise.all([
            fetch(`https://blockchain.info/rawaddr/${address}?cors=true`).then(res => res.ok ? res.json() : Promise.reject('Blockchain.info API failed')),
            fetch(`https://blockstream.info/api/address/${address}`).then(res => res.ok ? res.json() : Promise.reject('Blockstream.info API failed')),
            fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`).then(res => res.ok ? res.json() : Promise.reject('CoinGecko API failed')),
        ]);

        const firstTx = blockchainData.txs?.[blockchainData.txs.length - 1] || null;
        const balanceBtc = blockchainData.final_balance / 1e8;

        const reportData = {
            address: address,
            age: firstTx ? new Date(firstTx.time * 1000).toISOString() : "N/A",
            txCount: blockchainData.n_tx,
            totalReceived: blockchainData.total_received / 1e8,
            totalSent: blockchainData.total_sent / 1e8,
            balanceBtc: balanceBtc,
            balanceUsd: balanceBtc * (btcPrice.bitcoin?.usd || 0),
            blockstream_tx_count: blockstreamData.chain_stats.tx_count, // Dữ liệu bổ sung từ Blockstream
        };
        
        this.currentThirdPartyData = reportData;
        sessionStorage.setItem(cacheKey, JSON.stringify(reportData));
        this.displayThirdPartyReport(this.formatReportForDisplay(reportData));

    } catch(error) {
        console.error('Lỗi khi fetch dữ liệu bên thứ ba:', error);
        reportContent.innerHTML = `<div class="report-item" style="color: #f44336; justify-content: center;">Failed to load report. One of the APIs may be down.</div>`;
    } finally {
        loadingIndicator.style.display = 'none';
        reportContent.style.display = 'block';
    }
  },
  
  /**
   * Cập nhật UI cho card "Third-party Report"
   */
  displayThirdPartyReport(data = {}) {
    document.getElementById("report-age").textContent = data.age || '--';
    document.getElementById("report-tx-count").textContent = data.txCount || '--';
    document.getElementById("report-total-received").textContent = data.totalReceived || '--';
    document.getElementById("report-balance-btc").textContent = data.balanceBtc || '--';
    document.getElementById("report-balance-usd").textContent = data.balanceUsd || '--';
    // Lưu ý: totalSent và blockstream_tx_count được xử lý nhưng có thể không có element tương ứng trong HTML
  },

  /**
   * Định dạng dữ liệu thô để hiển thị đẹp hơn trên UI.
   */
  formatReportForDisplay(rawData) {
    if (!rawData) return {};
    return {
      ...rawData,
      age: rawData.age !== "N/A" ? new Date(rawData.age).toLocaleDateString("en-GB") : "N/A",
      totalReceived: rawData.totalReceived.toFixed(8) + " BTC",
      totalSent: rawData.totalSent.toFixed(8) + " BTC",
      balanceBtc: rawData.balanceBtc.toFixed(8) + " BTC",
      balanceUsd: `$${rawData.balanceUsd.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    };
  },


  // --- HÀM ĐIỀU PHỐI VÀ TIỆN ÍCH ---

  /**
   * Hàm điều phối chính, gọi các hàm con để xử lý từng card.
   * @param {string} address
   */
  analyzeAddress(address) {
    this.currentAddress = address;
    // Gọi cả hai hàm để fetch dữ liệu song song
    this.fetchAndDisplayInternalAnalysis(address);
    this.fetchAndDisplayThirdPartyReport(address);
  },

  /**
   * Xuất báo cáo CSV, gộp dữ liệu từ cả hai nguồn.
   */
  exportReport() {
    if (!this.currentThirdPartyData && !this.currentInternalData) {
      alert("Không có dữ liệu để xuất!");
      return;
    }

    const headers = [
      // Dữ liệu từ bên thứ ba
      "Address", "First_Transaction_Date", "Total_Transactions", "Total_Received_BTC", "Total_Sent_BTC", "Final_Balance_BTC", "Estimated_Value_USD",
      // Dữ liệu từ phân tích nội bộ
      "Is_CoinJoin", "CoinJoin_Transactions_Count", "Analysis_Summary"
    ];
    
    const d3rd = this.currentThirdPartyData || {};
    const dInt = this.currentInternalData || {};

    const row = [
      this.currentAddress,
      d3rd.age ? new Date(d3rd.age).toLocaleDateString("en-CA") : "N/A", // en-CA for YYYY-MM-DD format
      d3rd.txCount || "N/A",
      d3rd.totalReceived?.toFixed(8) || "N/A",
      d3rd.totalSent?.toFixed(8) || "N/A",
      d3rd.balanceBtc?.toFixed(8) || "N/A",
      d3rd.balanceUsd?.toFixed(2) || "N/A",
      
      typeof dInt.is_coinjoin === 'boolean' ? dInt.is_coinjoin : "N/A",
      dInt.coinjoin_transactions?.length || 0,
      `"${dInt.message || 'N/A'}"` // Bọc message trong dấu ngoặc kép để tránh lỗi CSV nếu có dấu phẩy
    ];

    const csvContent = [headers.join(","), row.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${this.currentAddress}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Ẩn/hiện và kích hoạt phân tích.
   */
  toggleAnalysis() {
    const section = document.querySelector(".analysis-section");
    if (!section) return;

    const isHidden = section.style.display === "none" || !section.style.display;
    section.style.display = isHidden ? "grid" : "none";
    
    if (isHidden) {
      const address = document.getElementById("checkInput").value.trim();
      if (address) {
        this.analyzeAddress(address);
        const headerHeight = 90; 
        const y = section.getBoundingClientRect().top + window.pageYOffset - headerHeight;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  },

  /**
   * Khởi tạo các event listeners cho các nút.
   */
  init() {
    document.querySelector(".analysis-btn")?.addEventListener("click", () => this.toggleAnalysis());
    document.getElementById("hideAnalysisBtn")?.addEventListener("click", () => {
      const section = document.querySelector(".analysis-section");
      if(section) section.style.display = "none";
    });
    document.getElementById("exportReportBtn")?.addEventListener("click", () => this.exportReport());
  },
};

window.AnalysisService = AnalysisService;