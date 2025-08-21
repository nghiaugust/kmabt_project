# main/management/commands/run_all.py

import subprocess
import os
import sys
import time
from django.core.management.base import BaseCommand
from django.core.management import call_command
from neo4j import GraphDatabase, exceptions

class Command(BaseCommand):
    help = 'Intelligently starts all services: Neo4j (Docker or existing), external API, and Django server.'

    def handle(self, *args, **options):
        # --- Cấu hình ---
        api_dir = os.path.join(os.getcwd(), 'bitcoin-tracer-main')
        neo4j_uri = "bolt://localhost:7687"
        # Lấy mật khẩu từ file config hoặc đặt mặc định
        # (Bạn nên có cách lấy mật khẩu động thay vì hardcode)
        neo4j_auth = ("neo4j", "password123") 
        docker_started_by_script = False
        api_process = None

        # --- Hàm kiểm tra kết nối Neo4j ---
        def is_neo4j_ready():
            try:
                with GraphDatabase.driver(neo4j_uri, auth=neo4j_auth) as driver:
                    driver.verify_connectivity()
                return True
            except (exceptions.ServiceUnavailable, exceptions.AuthError):
                return False

        try:
            # --- BƯỚC 1: KIỂM TRA VÀ KHỞI ĐỘNG NEO4J ---
            self.stdout.write(self.style.SUCCESS('🚀 [1/3] Checking for running Neo4j instance...'))
            if is_neo4j_ready():
                self.stdout.write(self.style.SUCCESS('✅ Neo4j is already running (e.g., from Neo4j Desktop). Skipping Docker.'))
            else:
                self.stdout.write(self.style.WARNING('- Neo4j not found. Attempting to start via Docker...'))
                try:
                    subprocess.run(
                        ['docker-compose', 'up', '-d'], 
                        cwd=api_dir, check=True, capture_output=True
                    )
                    docker_started_by_script = True
                    self.stdout.write(self.style.SUCCESS('✅ Docker command executed. Now waiting for Neo4j to be ready...'))
                    
                    # Vòng lặp chờ thông minh
                    max_wait_time = 45  # Chờ tối đa 45 giây
                    for i in range(max_wait_time):
                        if is_neo4j_ready():
                            self.stdout.write(self.style.SUCCESS(f'✅ Neo4j is ready after {i+1} seconds!'))
                            break
                        time.sleep(1)
                    else: # Chạy khi vòng lặp hết mà không break
                        self.stderr.write(self.style.ERROR('❌ Neo4j failed to start within the time limit.'))
                        return # Thoát lệnh
                except (FileNotFoundError, subprocess.CalledProcessError) as e:
                    self.stderr.write(self.style.ERROR(f'❌ Failed to start Docker. Please ensure Docker is installed and running, or start Neo4j manually.\nError: {e}'))
                    return # Thoát lệnh

            # --- BƯỚC 2: KHỞI ĐỘNG API RIÊNG ---
            self.stdout.write(self.style.SUCCESS('🚀 [2/3] Starting the external API server (start_api.py)...'))
            python_executable = sys.executable
            api_process = subprocess.Popen([python_executable, 'start_api.py'], cwd=api_dir)
            self.stdout.write(self.style.SUCCESS(f'✅ External API is running with PID: {api_process.pid}'))
            time.sleep(5) # Vẫn chờ 1 chút để Uvicorn khởi động

            # --- BƯỚC 3: KHỞI ĐỘNG DJANGO ---
            self.stdout.write(self.style.SUCCESS('🚀 [3/3] Starting Django development server...'))
            call_command('runserver')

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\n🛑 Server stopped by user.'))
        finally:
            # --- DỌN DẸP ---
            self.stdout.write(self.style.WARNING('\n🧹 Cleaning up background processes...'))
            if api_process:
                api_process.terminate()
            if docker_started_by_script:
                self.stdout.write(self.style.WARNING('Shutting down Neo4j container...'))
                subprocess.run(['docker-compose', 'down'], cwd=api_dir, capture_output=True)
            self.stdout.write(self.style.SUCCESS('✅ Cleanup complete. Goodbye!'))