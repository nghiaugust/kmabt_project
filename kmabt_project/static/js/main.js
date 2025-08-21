// main.js - Điểm khởi đầu ứng dụng Bitcoin Tracer
document.addEventListener("DOMContentLoaded", () => {
    // Khởi tạo các services và controllers
    console.log("Bitcoin Tracer - Initializing...");

    try {
        // Khởi tạo Price Service
        PriceService.init();
        console.log("✓ Price Service initialized");

        // Khởi tạo Mempool Service
        MempoolService.init();
        console.log("✓ Mempool Service initialized");

        // Khởi tạo UI Controller
        UIController.init();
        console.log("✓ UI Controller initialized");

        console.log("🚀 Bitcoin Tracer ready!");

    } catch (error) {
        console.error("❌ Error initializing Bitcoin Tracer:", error);
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});