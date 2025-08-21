// priceService.js - Quản lý giá Bitcoin
const PriceService = {
    btcPriceUSD: null,

    // Lấy giá BTC từ mempool.space
    async fetchBTCPrice() {
        try {
            const res = await fetch("https://mempool.space/api/v1/prices");
            const data = await res.json();
            if (data && typeof data.USD === "number") {
                this.btcPriceUSD = data.USD;
                this.displayBTCPrice();
            }
        } catch (err) {
            console.error("Error fetching BTC price from mempool:", err);
        }
    },

    // Hiển thị giá BTC trên UI
    displayBTCPrice() {
        if (this.btcPriceUSD !== null) {
            const btcPriceElem = document.getElementById("btcPriceInline");
            if (btcPriceElem) {
                btcPriceElem.innerText = `BTC Price: $${this.btcPriceUSD.toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )} USD`;
            }
        }
    },

    // Khởi tạo và cập nhật giá định kỳ
    init() {
        // Lấy tỷ giá BTC ban đầu
        this.fetchBTCPrice();
        
        // Cập nhật tỷ giá mỗi 60 giây
        setInterval(() => this.fetchBTCPrice(), 60000);
    }
};

// Export
window.PriceService = PriceService;