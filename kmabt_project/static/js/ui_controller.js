// uiController.js - Quản lý giao diện người dùng
const UIController = {
  // Xử lý Enter trong input tìm kiếm
  handleEnter() {
    const q = document.getElementById("checkInput").value.trim();
    const analyticsResults = document.getElementById("analyticsResults");
    const analyticsDataInline = document.getElementById("analyticsDataInline");
    const logoContainer = document.getElementById("logoContainer");
    const viewAnalysisBtn = document.querySelector(".analysis-btn");

    // Ẩn nút trước khi phân tích
    if (viewAnalysisBtn) viewAnalysisBtn.style.display = "none";

    if (!q) return;

    // Reset overlay
    const overlay = document.getElementById("txOverlay");
    const overlayBody = document.getElementById("txOverlayBody");
    if (overlay) {
      overlay.style.display = "none";
      overlayBody.innerHTML = "";
    }

    // Hiển thị panel kết quả & loading
    logoContainer.style.display = "none";
    analyticsResults.style.display = "block";
    analyticsResults.classList.add("loading");
    analyticsDataInline.innerHTML = 'Loading<span class="loading-dots"></span>';

    const showViewAnalysis = () => {
      if (viewAnalysisBtn) viewAnalysisBtn.style.display = "inline-block";
    };

    if (Utils.isTxid(q)) {
      TransactionService.analyzeTransaction(q)
        .catch(() => {
          analyticsDataInline.innerHTML = `<span style="color:#ff6b6b">Error loading TX</span>`;
        })
        .finally(() => analyticsResults.classList.remove("loading"));
    } else if (Utils.isBtcAddress(q)) {
      AddressService.analyzeAddress(q)
        .then(() => {
          showViewAnalysis();
        })
        .catch(() => {
          analyticsDataInline.innerHTML = `<span style="color:#ff6b6b">Error loading Address</span>`;
        })
        .finally(() => analyticsResults.classList.remove("loading"));
    } else {
      analyticsDataInline.innerHTML = `<span style="color:#ff6b6b">Invalid TXID or Address</span>`;
      analyticsResults.classList.remove("loading");
    }

    // Scroll xuống section phân tích
    const analysisSection = document.querySelector(".analysis-section");
    if (analysisSection) {
      analysisSection.scrollIntoView({ behavior: "smooth" });
    }
  },
  // Đóng panel phân tích
  closeAnalytics() {
    const logoContainer = document.getElementById("logoContainer");
    const analyticsResults = document.getElementById("analyticsResults");

    logoContainer.style.display = "flex";
    analyticsResults.style.display = "none";
  },

  // Thiết lập Scroll Toggle Button
  setupScrollToggle() {
    const scrollToggleBtn = document.getElementById("scrollToggleBtn");
    const scrollIcon = document.getElementById("scrollIcon");
    const scrollText = document.getElementById("scrollText");

    if (!scrollToggleBtn || !scrollIcon || !scrollText) return;

    const updateScrollBtn = () => {
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
    };

    scrollToggleBtn.addEventListener("click", () => {
      if (scrollToggleBtn.dataset.mode === "down") {
        const nextSection = document.querySelector(".content-grid");
        if (nextSection) {
          nextSection.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    // Cập nhật khi scroll
    window.addEventListener("scroll", updateScrollBtn);
    updateScrollBtn();
  },

  // Thiết lập Fade-in Animation Observer
  setupFadeInObserver() {
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
  },

  // Thiết lập toggle chi tiết giao dịch
  setupTransactionDetailsToggle() {
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
  },

  // Khởi tạo tất cả UI components
  init() {
    // Thiết lập các event listeners
    document
      .getElementById("closeResultsBtn")
      ?.addEventListener("click", this.closeAnalytics);

    // Bắt phím Enter trong input
    const checkInput = document.getElementById("checkInput");
    if (checkInput) {
      checkInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault(); // Ngăn form submit mặc định
          UIController.handleEnter();
        }
      });
    }

    // Nút View Analysis cạnh Enter
    const viewAnalysisBtn = document.getElementById("viewAnalysisBtn");
    viewAnalysisBtn?.addEventListener("click", () => {
      const analysisSection = document.querySelector(".analysis-section");
      if (analysisSection) {
        analysisSection.style.display = "block";
        viewAnalysisBtn.style.display = "none"; // ẩn nút View sau khi mở
        analysisSection.scrollIntoView({ behavior: "smooth" });
      }
    });

    // Nút Hide Analysis cuối section
    const hideAnalysisBtn = document.getElementById("hideAnalysisBtn");
    hideAnalysisBtn?.addEventListener("click", () => {
      const analysisSection = document.querySelector(".analysis-section");
      if (analysisSection) {
        analysisSection.style.display = "none";
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (viewAnalysisBtn) viewAnalysisBtn.style.display = "inline-block"; // hiện lại nút View
      }
    });

    // Thiết lập các UI components
    this.setupScrollToggle();
    this.setupFadeInObserver();
    this.setupTransactionDetailsToggle();
  },
};

// Export cho global access
window.UIController = UIController;
window.handleEnter = () => UIController.handleEnter();
window.closeAnalytics = () => UIController.closeAnalytics();
