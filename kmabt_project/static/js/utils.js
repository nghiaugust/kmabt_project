// utils.js - Các hàm tiện ích
const Utils = {
    // Hàm định dạng giá trị USD
    formatUSDValue(usdValueNum) {
        if (!Number.isFinite(usdValueNum) || usdValueNum <= 0) return "N/A";
        return usdValueNum.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
        });
    },

    // Hàm fetch với timeout
    fetchWithTimeout(resource, options = {}) {
        const { timeout = 8000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        return fetch(resource, {
            ...options,
            signal: controller.signal,
        }).finally(() => clearTimeout(id));
    },

    // Format BTC amount với các đơn vị khác nhau
    formatBTCAmount(btc) {
        if (!Number.isFinite(btc) || btc <= 0) {
            return { value: "0", unit: "sat" };
        }

        if (btc >= 0.01) {
            return { value: btc.toFixed(4), unit: "BTC" };
        } else if (btc >= 0.001) {
            return { value: (btc * 1e3).toFixed(2), unit: "mBTC" };
        } else if (btc >= 0.000001) {
            return { value: (btc * 1e6).toFixed(2), unit: "µBTC" };
        } else {
            const sats = Math.max(1, Math.round(btc * 1e8));
            return { value: String(sats), unit: "sat" };
        }
    },

    // Kiểm tra format TXID
    isTxid(str) {
        return /^[0-9a-fA-F]{64}$/.test(str);
    },

    isBtcAddress(input) {
        const isP2PKH = /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(input);
        const isP2SH = /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(input);
        const isBech32 = /^bc1[ac-hj-np-z02-9]{11,71}$/i.test(input);
        return isP2PKH || isP2SH || isBech32;
    }
};

// Export cho sử dụng trong các module khác
window.Utils = Utils;