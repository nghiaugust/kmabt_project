// addressService.js - Xử lý phân tích địa chỉ Bitcoin
const AddressService = {
    // Phân tích địa chỉ Bitcoin
    async analyzeAddress(address) {
        const walletAddressInline = document.getElementById("walletAddressInline");
        const analyticsDataInline = document.getElementById("analyticsDataInline");

        try {
            const res = await Utils.fetchWithTimeout(`https://mempool.space/api/address/${address}`, {
                timeout: 8000,
            });
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const addr = await res.json();
            
            walletAddressInline.innerText = "Address: " + address.substring(0, 20) + "...";

            // Tính toán balance
            const balanceSats = (addr.chain_stats?.funded_txo_sum || 0) - (addr.chain_stats?.spent_txo_sum || 0);
            const balanceBTC = balanceSats / 1e8;

            // USD value
            let usdValue = "N/A";
            if (PriceService.btcPriceUSD !== null) {
                usdValue = (balanceBTC * PriceService.btcPriceUSD).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
            }

            // Hiển thị thông tin
            analyticsDataInline.innerHTML = `
                <ul>
                    <li>Balance: ${balanceBTC.toFixed(8)} BTC</li>
                    <li>USD Value: $${usdValue}</li>
                    <li>Transactions: ${addr.chain_stats?.tx_count ?? 0}</li>
                    <li id="btcPriceInline"></li>
                </ul>
            `;

            PriceService.displayBTCPrice();

        } catch (err) {
            analyticsDataInline.innerHTML = `<span style="color:#ff6b6b">Error loading Address</span>`;
            console.error("Address fetch error:", err);
        }
    }
};

// Export
window.AddressService = AddressService;