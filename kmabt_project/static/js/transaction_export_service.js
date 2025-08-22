/**
 * Service để lấy và export dữ liệu giao dịch chi tiết
 */
const TransactionExportService = {
  currentAddress: null,
  allTransactions: [],
  isLoading: false,

  /**
   * Lấy giao dịch của một địa chỉ (chỉ gửi 1 request duy nhất)
   */
  async fetchTransactions(address, maxTransactions = 50) {
    this.currentAddress = address;
    this.allTransactions = [];
    this.isLoading = true;
    
    try {
      // Giới hạn maxTransactions từ 1-50 theo API
      const limit = Math.min(Math.max(maxTransactions, 1), 50);
      
      console.log(`Fetching ${limit} transactions for address: ${address}`);
      this.updateProgress(0, limit, 'Sending request...');
      
      const response = await fetch(`/api/address-transactions/?address=${encodeURIComponent(address)}&limit=${limit}&offset=0`);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('API is being rate limited. Please try again later.');
        } else if (response.status === 404) {
          throw new Error('Address not found or has no transactions');
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API error');
      }
      
      // Lưu giao dịch
      this.allTransactions = data.transactions || [];
      
      // Hiển thị progress hoàn thành
      this.updateProgress(this.allTransactions.length, this.allTransactions.length, 'Complete!');
      
      console.log(`Successfully fetched ${this.allTransactions.length} transactions for address ${address}`);
      
      return {
        success: true,
        transactions: this.allTransactions,
        address_info: data.address_info
      };
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.isLoading = false;
    }
  },

  /**
   * Export dữ liệu ra Excel sử dụng SheetJS (chỉ tạo sheet giao dịch)
   */
  exportToExcel(addressInfo, apiSource = 'Unknown') {
    if (!this.allTransactions || this.allTransactions.length === 0) {
      alert('No transaction data to export!');
      return;
    }

    try {
      // Tạo workbook mới
      const workbook = XLSX.utils.book_new();
      
      // Chỉ tạo 1 sheet: Chi tiết giao dịch với header bao gồm thông tin địa chỉ
      const transactionData = [
        // Header với thông tin địa chỉ
        ['Bitcoin Address Transaction Report', '', '', '', '', '', '', '', '', '', ''],
        ['Address', this.currentAddress, '', '', '', '', '', '', '', '', ''],
        ['Total Transactions', addressInfo.n_tx, '', '', '', '', '', '', '', '', ''],
        ['Total Received (BTC)', addressInfo.total_received.toFixed(8), '', '', '', '', '', '', '', '', ''],
        ['Total Sent (BTC)', addressInfo.total_sent.toFixed(8), '', '', '', '', '', '', '', '', ''],
        ['Final Balance (BTC)', addressInfo.final_balance.toFixed(8), '', '', '', '', '', '', '', '', ''],
        ['API Source', apiSource, '', '', '', '', '', '', '', '', ''],
        ['Export Date', new Date().toLocaleString(), '', '', '', '', '', '', '', '', ''],
        ['Exported Transactions', this.allTransactions.length, '', '', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', '', '', '', ''], // Empty row
        // Header cho bảng giao dịch
        [
          'Transaction Hash',
          'Date',
          'Type',
          'Value (BTC)',
          'Value (Satoshis)', 
          'Fee (Satoshis)',
          'Size (Bytes)',
          'Block Height',
          'Inputs Count',
          'Outputs Count',
          'Confirmed'
        ]
      ];
      
      // Thêm dữ liệu giao dịch
      this.allTransactions.forEach(tx => {
        transactionData.push([
          tx.hash,
          tx.date,
          tx.type,
          tx.value_btc.toFixed(8),
          tx.value_satoshis,
          tx.fee,
          tx.size,
          tx.block_height || 'Unconfirmed',
          tx.inputs_count,
          tx.outputs_count,
          tx.confirmed ? 'Yes' : 'No'
        ]);
      });
      
      const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
      
      // Thiết lập độ rộng cột
      transactionSheet['!cols'] = [
        {wch: 70}, // Transaction Hash
        {wch: 20}, // Date
        {wch: 10}, // Type
        {wch: 15}, // Value BTC
        {wch: 15}, // Value Satoshis
        {wch: 12}, // Fee
        {wch: 10}, // Size
        {wch: 12}, // Block Height
        {wch: 12}, // Inputs Count
        {wch: 12}, // Outputs Count
        {wch: 10}  // Confirmed
      ];
      
      XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');
      
      // Tạo tên file
      const fileName = `bitcoin-transactions-${this.currentAddress.substring(0, 10)}-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Download file
      XLSX.writeFile(workbook, fileName);
      
      alert(`Excel file exported successfully!\nFile: ${fileName}\nTransactions: ${this.allTransactions.length}\nAPI Source: ${apiSource}`);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error exporting to Excel: ' + error.message);
    }
  },

  /**
   * Hiển thị progress khi đang tải dữ liệu
   */
  updateProgress(current, total, statusMessage = null) {
    const progressElement = document.getElementById('export-progress');
    if (progressElement) {
      const percentage = Math.round((current / total) * 100);
      const message = statusMessage || `Fetched ${current} of ${total} transactions...`;
      
      progressElement.innerHTML = `
        <div class="progress mb-2">
          <div class="progress-bar ${statusMessage && statusMessage.includes('Rate limited') ? 'bg-warning' : ''}" 
               style="width: ${percentage}%">${percentage}%</div>
        </div>
        <small class="${statusMessage && statusMessage.includes('Rate limited') ? 'text-warning' : ''}">${message}</small>
      `;
    }
  },

  /**
   * Hiển thị modal export
   */
  showExportModal(address) {
    if (!address) {
      alert('Please enter a Bitcoin address first!');
      return;
    }

    // Tạo modal HTML
    const modalHTML = `
      <div class="modal fade" id="exportModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Export Transaction Data</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p><strong>Address:</strong> <code>${address}</code></p>
              <div class="mb-3">
                <label class="form-label">Number of transactions to fetch:</label>
                <select class="form-select" id="maxTransactions">
                  <option value="10">10 transactions</option>
                  <option value="20">20 transactions</option>
                  <option value="30">30 transactions</option>
                  <option value="50" selected>50 transactions (Maximum)</option>
                </select>
                <small class="text-muted">Note: API limit is maximum 50 transactions per request</small>
              </div>
              <div id="export-progress" style="display: none;"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="startExportBtn">
                <i class="bi bi-download"></i> Start Export
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Xóa modal cũ nếu có
    const existingModal = document.getElementById('exportModal');
    if (existingModal) {
      existingModal.remove();
    }

    // Thêm modal mới
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Hiển thị modal
    const modal = new bootstrap.Modal(document.getElementById('exportModal'));
    modal.show();

    // Xử lý sự kiện export
    document.getElementById('startExportBtn').addEventListener('click', async () => {
      const maxTransactions = parseInt(document.getElementById('maxTransactions').value);
      const progressDiv = document.getElementById('export-progress');
      const startBtn = document.getElementById('startExportBtn');
      
      // Disable button và hiển thị progress
      startBtn.disabled = true;
      startBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Processing...';
      progressDiv.style.display = 'block';
      
      try {
        const result = await this.fetchTransactions(address, maxTransactions);
        
        if (result.success) {
          // Export to Excel
          this.exportToExcel(result.address_info, result.api_source || 'Unknown');
          modal.hide();
        } else {
          // Hiển thị lỗi chi tiết hơn
          const errorMsg = result.error.includes('Rate limit') 
            ? 'API is being rate limited. Please try again in a few minutes.' 
            : result.error;
          
          // Hiển thị trong progress div thay vì alert
          progressDiv.innerHTML = `
            <div class="alert alert-danger mb-0">
              <strong>Error:</strong> ${errorMsg}
            </div>
          `;
          
          setTimeout(() => {
            progressDiv.style.display = 'none';
          }, 5000);
        }
      } catch (error) {
        // Hiển thị lỗi trong progress div
        const errorMsg = error.message.includes('Rate limit') 
          ? 'API rate limit exceeded. Please wait a few minutes before trying again.' 
          : error.message;
          
        progressDiv.innerHTML = `
          <div class="alert alert-danger mb-0">
            <strong>Error:</strong> ${errorMsg}
          </div>
        `;
        
        setTimeout(() => {
          progressDiv.style.display = 'none';
        }, 5000);
      } finally {
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="bi bi-download"></i> Start Export';
      }
    });
  },

  /**
   * Khởi tạo service
   */
  init() {
    // Thêm button export vào analysis section
    const analysisSection = document.querySelector('.analysis-section .text-center');
    if (analysisSection) {
      const exportTransactionsBtn = document.createElement('button');
      exportTransactionsBtn.id = 'exportTransactionsBtn';
      exportTransactionsBtn.className = 'analysis-btn ms-2';
      exportTransactionsBtn.style.cssText = 'padding: 8px 15px; font-size: 0.9em; padding-bottom: 5px;';
      exportTransactionsBtn.innerHTML = '<i class="bi bi-file-earmark-excel"></i> Export Transactions (.xlsx)';
      
      analysisSection.appendChild(exportTransactionsBtn);
      
      exportTransactionsBtn.addEventListener('click', () => {
        const address = document.getElementById('checkInput').value.trim();
        this.showExportModal(address);
      });
    }
  }
};

// Load SheetJS library if not already loaded
if (typeof XLSX === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  script.onload = () => {
    console.log('SheetJS library loaded');
  };
  document.head.appendChild(script);
}

// Initialize when DOM is ready
window.TransactionExportService = TransactionExportService;
document.addEventListener('DOMContentLoaded', () => {
  TransactionExportService.init();
});
