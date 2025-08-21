from django.db import models

# Create your models here.

class Address(models.Model):
    # Thông tin cơ bản
    address = models.CharField(max_length=100, unique=True, db_index=True)
    report_type = models.CharField(max_length=50)  # Cho phép người dùng nhập tự do
    description = models.TextField(blank=True)
    
    # Thông tin người báo cáo
    reporter_email = models.EmailField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.address[:20]}... ({self.report_type})"
    
    class Meta:
        db_table = 'btc_addresses'

class Transaction(models.Model):
    # Thông tin cơ bản
    txid = models.CharField(max_length=100, unique=True, db_index=True)
    report_type = models.CharField(max_length=50)  # Cho phép người dùng nhập tự do
    description = models.TextField(blank=True)
    
    # Thông tin người báo cáo
    reporter_email = models.EmailField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.txid[:20]}... ({self.report_type})"
    
    class Meta:
        db_table = 'btc_transactions'
