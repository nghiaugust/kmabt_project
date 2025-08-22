# **KMABT - Dự án hỗ trợ truy vết và phân tích cơ bản đến chuyên sâu**

**Blockchain Tracer** là một ứng dụng web được phát triển bởi nhóm **KMABT (KMA Blockchain Tracer)**. Dự án được xây dựng bằng Django để nhập, phân tích và trực quan hóa dữ liệu từ một blockchain, nhằm mục đích truy vết các giao dịch và cung cấp cái nhìn sâu sắc về chúng, bên cạnh đó đưa ra thông tin dự đoán về mức độ nguy hiểm của địa chỉ ví Bitcoin.

## **✨ Tính năng chính**

* **Phân tích địa chỉ ví**: Thu thập dữ liệu, thông tin ví từ nhiều nguồn, đưa ra insight về ví đó.  
* **Phân tích giao dịch**: Thu thập dữ liệu về giao dịch Bitcoin Blockchain, hỗ trợ công việc truy vết của các điều tra viên.  
* **Trực quan hóa Dữ liệu**: Hiển thị danh sách giao dịch và các biểu đồ đồ thị (graph) trực quan để dễ dàng truy vết và hiểu rõ luồng dữ liệu.  
* **Giao diện Web**: Cung cấp giao diện web thân thiện và dễ sử dụng để người dùng tương tác với ứng dụng.  
* **Quản lý người dùng**: Hệ thống đăng ký và đăng nhập cơ bản cho người dùng.
* **Tố cáo - Report**: User có thể khiếu nại, tố cáo các địa chỉ ví hay giao dịch đáng ngờ, và thông qua Admin, thông tin đó được publish trên List Reports của dự án.

## **📂 Cấu trúc Dự án**

Dưới đây là mô tả ngắn về các thành phần chính trong thư mục dự án.
```
.  
│   bitcoin-tracer-main.rar     #Folder core algorithm
│   db.sqlite3                  #Our databse
│   README.md
│   requirements.txt            #Thư viện cần thiết
│   
├───kmabt_project
│   
├───main
│   ├───management
│   │   └───commands
│   │       └───run_all.py      #Thực thi mã nguồn
│   │
│   ├───migrations
│   └───templates               #Folder html
│   
└───static
    ├───css                     #Folder css
    ├───images                  #Folder ảnh - logo
    └───js                      #Folder javascript
```
## **🚀 Bắt đầu**

Để cài đặt và chạy dự án trên máy của bạn, hãy làm theo các bước dưới đây.

### **Yêu cầu**
* [Python 3.8+](https://www.python.org/downloads/)  
* [pip](https://pip.pypa.io/en/stable/installation/) (thường được cài sẵn với Python)
* **MySQL Server**: Đảm bảo MySQL Server đã được cài đặt và đang chạy trên hệ thống của bạn. Bạn có thể tải xuống từ trang chính thức của [MySQL](https://dev.mysql.com/downloads/)

### **Hướng dẫn Cài đặt**

1. **Clone repository về máy:**
```bash
git clone https://github.com/nghiaugust/kmabt_project.git
cd kmabt_project
```
2. Cài đặt các thư viện cần thiết trong project:  
```bash
pip install -r requirements.txt
```

3. Giải nén folder thuật toán detect Coinjoin và Peeling Chain
 - Giải nén `bitcoin-tracer-main.rar`

## **🎮 Sử dụng**

Khởi động server Django:
```bash
python manage.py run_all
```

Bây giờ bạn có thể truy cập ứng dụng web qua các đường dẫn sau:

* **Trang chủ**: [localhost:8000](localhost:8000)
* **Tài liệu sử dụng API**: [localhost:8005/docs](localhost:8005/docs)

## **👥 Đội ngũ phát triển**

Dự án này được xây dựng và duy trì bởi nhóm **KMABT (KMA Blockchain Tracer)**.

## **📄 Giấy phép**

Bản quyền © 2025 KMABT (KMA Blockchain Tracer).

Dự án này được cấp phép theo Giấy phép MIT. Xem file [LICENSE](https://github.com/nghiaugust/kmabt_project/blob/main/LICENSE.md) để biết thêm chi tiết.

## **📧 Liên hệ**

Nếu bạn có bất kỳ câu hỏi hoặc đề xuất nào, vui lòng mở một vấn đề (issue) trên GitHub hoặc liên hệ với chúng tôi tại [domanhnghiaforwork@gmail.com](mailto:domanhnghiaforwork@gmail.com).