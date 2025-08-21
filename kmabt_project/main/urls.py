from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('graph/', views.graph, name='graph'),
    path('scams/', views.scams, name='scams'),
    path('introduction/', views.introduction, name='introduction'),
    path('report/', views.report, name='report'),
    path('list-report/', views.list_report, name='list_report'),
    path('graph_data/', views.graph_data, name='graph_data'), # API cho dữ liệu graph
    path('expand_node/', views.expand_node, name='expand_node'), # API mở rộng node

    path('submit-report/', views.submit_report, name='submit_report'), # API gửi báo cáo
    path('api/reported-addresses/', views.get_reported_addresses, name='get_reported_addresses'), # API lấy địa chỉ đã báo cáo
    path('api/reported-transactions/', views.get_reported_transactions, name='get_reported_transactions'), # API lấy giao dịch đã báo cáo
    
    # APIs cho staff quản lý reports
    path('api/update-address-status/', views.update_address_status, name='update_address_status'),
    path('api/update-transaction-status/', views.update_transaction_status, name='update_transaction_status'),
    path('api/delete-address-report/<int:address_id>/', views.delete_address_report, name='delete_address_report'),
    path('api/delete-transaction-report/<int:transaction_id>/', views.delete_transaction_report, name='delete_transaction_report'),
    
    path('login/', views.login_view, name='login'), # Trang đăng nhập
    path('logout/', views.logout_view, name='logout'), # Đăng xuất
]