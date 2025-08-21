const AnalysisService = {
  currentReportData: null,
  currentAddress: null,

  /**
   * Lấy dữ liệu từ API của Blockchain.info.
   * @param {string} address Địa chỉ Bitcoin cần kiểm tra.
   */
  async fetchBlockchainInfoData(address) {
    const apiUrl = `https://blockchain.info/rawaddr/${address}?cors=true`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`Blockchain.info API error!`);
      return await response.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  /**
   * ⭐ THAY THẾ: Lấy dữ liệu từ API của Blockstream.info.
   * @param {string} address Địa chỉ Bitcoin cần kiểm tra.
   */
  async fetchBlockstreamData(address) {
    const apiUrl = `https://blockstream.info/api/address/${address}`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`Blockstream.info API error!`);
      return await response.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  /**
   * Lấy giá BTC/USD hiện tại từ CoinGecko.
   */
  async fetchBtcPrice() {
    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`CoinGecko API error!`);
      const data = await response.json();
      return data.bitcoin.usd;
    } catch (error) {
      console.error(error);
      return null;
    }
  },

  /**
   * Hàm chính điều phối việc phân tích và tạo báo cáo.
   */
  async analyzeAddress(address) {
    this.currentAddress = address;
    this.setLoading(true);

    const cacheKey = `report-${address}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
      console.log("Loading report from cache...");
      this.currentReportData = JSON.parse(cachedData);
      this.displayReport(this.formatReportForDisplay(this.currentReportData));
      this.setLoading(false);
      return;
    }

    console.log("Fetching new report from APIs...");
    // ⭐ THAY THẾ: Gọi API của Blockstream thay vì BTC.com
    const [blockchainData, blockstreamData, btcPrice] = await Promise.all([
      this.fetchBlockchainInfoData(address),
      this.fetchBlockstreamData(address),
      this.fetchBtcPrice(),
    ]);

    if (!blockchainData || !btcPrice || !blockstreamData) {
      alert(
        "Could not generate the report. One of the APIs failed. Please try again later."
      );
      this.setLoading(false);
      return;
    }

    const firstTx =
      blockchainData.txs && blockchainData.txs.length > 0
        ? blockchainData.txs[blockchainData.txs.length - 1]
        : null;

    const balanceBtc = blockchainData.final_balance / 1e8;
    const balanceUsd = balanceBtc * btcPrice;

    this.currentReportData = {
      address: address,
      age: firstTx ? new Date(firstTx.time * 1000).toISOString() : "N/A",
      txCount: blockchainData.n_tx, // Dữ liệu chính từ Blockchain.info
      totalReceived: blockchainData.total_received / 1e8,
      totalSent: blockchainData.total_sent / 1e8,
      balanceBtc: balanceBtc,
      balanceUsd: balanceUsd,
      // Dữ liệu từ blockstream có thể dùng để kiểm tra chéo nếu cần
      blockstream_tx_count: blockstreamData.chain_stats.tx_count,
    };

    sessionStorage.setItem(cacheKey, JSON.stringify(this.currentReportData));

    this.displayReport(this.formatReportForDisplay(this.currentReportData));

    this.setLoading(false);
  },

  /**
   * Định dạng dữ liệu thô để hiển thị đẹp hơn trên UI.
   * @param {object} rawData Dữ liệu báo cáo thô.
   * @returns {object} Dữ liệu đã được định dạng.
   */
  formatReportForDisplay(rawData) {
    return {
      ...rawData,
      age:
        rawData.age !== "N/A"
          ? new Date(rawData.age).toLocaleDateString("vi-VN")
          : "N/A",
      totalReceived: rawData.totalReceived.toFixed(8) + " BTC",
      totalSent: rawData.totalSent.toFixed(8) + " BTC",
      balanceBtc: rawData.balanceBtc.toFixed(8) + " BTC",
      balanceUsd: `$${rawData.balanceUsd.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    };
  },

  /**
   * Hiển thị dữ liệu báo cáo lên các element HTML.
   */
  displayReport(data) {
    document.getElementById("report-age").textContent = data.age;
    document.getElementById("report-tx-count").textContent = data.txCount;
    document.getElementById("report-total-received").textContent =
      data.totalReceived;
    // Lưu ý: totalSent không có trong layout HTML hiện tại, nhưng logic vẫn xử lý
    document.getElementById("report-balance-btc").textContent = data.balanceBtc;
    document.getElementById("report-balance-usd").textContent = data.balanceUsd;
  },

  /**
   * Xuất báo cáo ra file .csv
   */
  exportReport() {
    if (!this.currentReportData) {
      alert("No report data to export!");
      return;
    }

    const headers = [
      "Address",
      "First_Transaction_Date",
      "Total_Transactions",
      "Total_Received_BTC",
      "Total_Sent_BTC",
      "Final_Balance_BTC",
      "Estimated_Value_USD",
    ];
    const data = this.currentReportData;
    const row = [
      data.address,
      data.age !== "N/A"
        ? new Date(data.age).toLocaleDateString("en-CA")
        : "N/A",
      data.txCount,
      data.totalReceived.toFixed(8),
      data.totalSent.toFixed(8),
      data.balanceBtc.toFixed(8),
      data.balanceUsd.toFixed(2),
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

  // --- Các hàm tiện ích và quản lý giao diện ---
  setLoading(isLoading) {
    document.getElementById("report-loading").style.display = isLoading
      ? "flex"
      : "none";
    document.getElementById("report-content").style.display = isLoading
      ? "none"
      : "block";
  },

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
        const y =
          section.getBoundingClientRect().top +
          window.pageYOffset -
          headerHeight;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }
  },

  init() {
    const viewBtn = document.querySelector(".analysis-btn");
    if (viewBtn) {
      viewBtn.addEventListener("click", () => this.toggleAnalysis());
    }
    const hideBtn = document.getElementById("hideAnalysisBtn");
    if (hideBtn) {
      hideBtn.addEventListener("click", () => {
        const section = document.querySelector(".analysis-section");
        if (section) section.style.display = "none";
      });
    }
    const exportBtn = document.getElementById("exportReportBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => this.exportReport());
    }
  },
};

window.AnalysisService = AnalysisService;
document.addEventListener("DOMContentLoaded", () => {
  AnalysisService.init();
});
