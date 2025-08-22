
from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import redirect
from django.contrib import messages
import requests
import json
import re
import time
import traceback
from urllib.parse import unquote
from datetime import datetime

from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from .models import Address, Transaction

def home(request):
    return render(request, 'index.html')

def graph(request):
    return render(request, 'graph.html')

def scams(request):
    return render(request, 'scams.html')

def introduction(request):
    return render(request, 'introduction.html')

def report(request):
    return render(request, 'report.html')

def list_report(request):
    return render(request, 'list_report.html')

def login_view(request):
    """View xử lý đăng nhập"""
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        if username and password:
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                messages.success(request, 'Login successful!')
                return redirect('home')  # Chuyển hướng về trang chủ
            else:
                messages.error(request, 'Invalid username or password!')
        else:
            messages.error(request, 'Please fill in all fields!')
    
    return render(request, 'login.html')

def logout_view(request):
    """View xử lý đăng xuất"""
    logout(request)
    messages.success(request, 'Logout successful!')
    return redirect('home')

def _sats_to_btc(value):
    try:
        return (value or 0) / 100_000_000
    except Exception:
        return 0.0


def _fetch_address_info_blockstream(address: str):
    """Fetch address info from Blockstream/Esplora API (no key, reliable).
    Docs: https://blockstream.info/api/#address
    """
    url = f"https://blockstream.info/api/address/{address}"
    try:
        resp = requests.get(url, timeout=15)
        print(f"Blockstream API URL: {url}")
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            chain = data.get('chain_stats', {})
            mempool = data.get('mempool_stats', {})
            funded = chain.get('funded_txo_sum', 0)
            spent = chain.get('spent_txo_sum', 0)
            m_funded = mempool.get('funded_txo_sum', 0)
            m_spent = mempool.get('spent_txo_sum', 0)
            return {
                'address': address,
                'balance': _sats_to_btc(funded - spent),
                'total_received': _sats_to_btc(funded),
                'total_sent': _sats_to_btc(spent),
                'n_tx': (chain.get('tx_count') or 0) + (mempool.get('tx_count') or 0),
                'unconfirmed_balance': _sats_to_btc(m_funded - m_spent),
                'final_balance': _sats_to_btc(funded - spent),
                'api_source': 'Blockstream'
            }
        else:
            print(f"Blockstream Error: {resp.text}")
    except Exception as e:
        print(f"Blockstream API Error: {e}")
    return None


def _fetch_address_info_blockchain(address: str):
    url = f"https://blockchain.info/rawaddr/{address}"
    try:
        resp = requests.get(url, timeout=15)
        print(f"Blockchain.info API URL: {url}")
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Blockchain.info response keys: {list(data.keys())}")
            return {
                'address': address,
                'balance': _sats_to_btc(data.get('final_balance', 0)),
                'total_received': _sats_to_btc(data.get('total_received', 0)),
                'total_sent': _sats_to_btc(data.get('total_sent', 0)),
                'n_tx': data.get('n_tx', 0),
                'unconfirmed_balance': 0,
                'final_balance': _sats_to_btc(data.get('final_balance', 0)),
                'api_source': 'Blockchain.info'
            }
        else:
            print(f"Blockchain.info Error: {resp.text}")
    except Exception as e:
        print(f"Blockchain.info API Error: {e}")
    return None


def _fetch_address_info_blockcypher(address: str):
    url = f"https://api.blockcypher.com/v1/btc/main/addrs/{address}"
    try:
        resp = requests.get(url, timeout=15)
        print(f"BlockCypher API URL: {url}")
        print(f"Response status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            return {
                'address': address,
                'balance': _sats_to_btc(data.get('balance', 0)),
                'total_received': _sats_to_btc(data.get('total_received', 0)),
                'total_sent': _sats_to_btc(data.get('total_sent', 0)),
                'n_tx': data.get('n_tx', 0),
                'unconfirmed_balance': _sats_to_btc(data.get('unconfirmed_balance', 0)),
                'final_balance': _sats_to_btc(data.get('final_balance', 0)),
                'api_source': 'BlockCypher'
            }
        else:
            print(f"BlockCypher Error: {resp.text}")
    except Exception as e:
        print(f"BlockCypher API Error: {e}")
    return None


def search_bitcoin_address(address):
    """Tìm kiếm thông tin địa chỉ Bitcoin thật từ nhiều API (fallback chain)."""
    # Ưu tiên Blockstream (Esplora) -> Blockchain.info -> BlockCypher
    for fetcher in (_fetch_address_info_blockstream, _fetch_address_info_blockchain, _fetch_address_info_blockcypher):
        info = fetcher(address)
        if info:
            return info
    return None

def _normalize_txs_blockstream(txs):
    """Chuẩn hóa danh sách tx từ Blockstream thành dạng có inputs/outputs tương thích code hiện tại."""
    norm = []
    for tx in txs:
        # Inputs (vin)
        inputs = []
        for vin in tx.get('vin', []):
            prevout = vin.get('prevout') or {}
            addr = prevout.get('scriptpubkey_address')
            value = prevout.get('value', 0)
            if addr:
                inputs.append({
                    'addresses': [addr],
                    'output_value': value
                })
        # Outputs (vout)
        outputs = []
        for vout in tx.get('vout', []):
            addr = vout.get('scriptpubkey_address')
            value = vout.get('value', 0)
            if addr:
                outputs.append({
                    'addresses': [addr],
                    'value': value
                })
        # Time
        confirmed = None
        status = tx.get('status') or {}
        if status.get('confirmed') and status.get('block_time'):
            confirmed = datetime.utcfromtimestamp(status['block_time']).strftime('%Y-%m-%d')

        norm.append({
            'hash': tx.get('txid'),
            'inputs': inputs,
            'outputs': outputs,
            'confirmed': confirmed or 'Unconfirmed'
        })
    return norm


def _normalize_txs_blockchaininfo(raw):
    norm = []
    for tx in raw:
        inputs = []
        for i in tx.get('inputs', []):
            prev = (i or {}).get('prev_out') or {}
            addr = prev.get('addr')
            value = prev.get('value', 0)
            if addr:
                inputs.append({
                    'addresses': [addr],
                    'output_value': value
                })
        outputs = []
        for o in tx.get('out', []):
            addr = o.get('addr')
            value = o.get('value', 0)
            if addr:
                outputs.append({
                    'addresses': [addr],
                    'value': value
                })
        confirmed = None
        if tx.get('time'):
            confirmed = datetime.utcfromtimestamp(tx['time']).strftime('%Y-%m-%d')
        norm.append({
            'hash': tx.get('hash'),
            'inputs': inputs,
            'outputs': outputs,
            'confirmed': confirmed or 'Unconfirmed'
        })
    return norm


def get_address_transactions(address, limit=10):
    """Lấy các giao dịch của địa chỉ Bitcoin (ưu tiên Blockstream, fallback Blockchain.info)."""
    # Try Blockstream/Esplora
    try:
        url = f"https://blockstream.info/api/address/{address}/txs"
        resp = requests.get(url, timeout=15)
        print(f"Blockstream TXs URL: {url} -> {resp.status_code}")
        if resp.status_code == 200:
            txs = resp.json()
            return _normalize_txs_blockstream(txs[:limit])
        else:
            print(f"Blockstream TXs Error: {resp.text}")
    except Exception as e:
        print(f"Blockstream TXs API Error: {e}")

    # Fallback: blockchain.info
    try:
        url = f"https://blockchain.info/rawaddr/{address}?limit={max(50, limit)}"
        resp = requests.get(url, timeout=15)
        print(f"Blockchain.info TXs URL: {url} -> {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            txs = data.get('txs', [])
            return _normalize_txs_blockchaininfo(txs[:limit])
        else:
            print(f"Blockchain.info TXs Error: {resp.text}")
    except Exception as e:
        print(f"Blockchain.info TXs API Error: {e}")

    # Final fallback: empty list
    return []

# API trả về dữ liệu graph blockchain (dữ liệu mẫu mở rộng)
def graph_data(request):
    # Kiểm tra nếu có tìm kiếm địa chỉ Bitcoin thật
    search_address = request.GET.get('address', '')
    
    if search_address:
        # Tìm kiếm địa chỉ Bitcoin thật
        address_info = search_bitcoin_address(search_address)
        transactions = get_address_transactions(search_address, 5)
        
        if address_info:
            nodes = []
            edges = []
            
            # Thêm node chính (địa chỉ được tìm kiếm)
            nodes.append({
                'data': {
                    'id': search_address,                  # dùng nguyên địa chỉ làm id để nhất quán
                    'label': f"{search_address[:8]}...{search_address[-6:]}",
                    'type': 'address',
                    'amount': f"{address_info['balance']:.4f} BTC",
                    'balance': f"{address_info['balance']:.8f} BTC",
                    'details': f"Received: {address_info['total_received']:.4f} BTC\nSent: {address_info['total_sent']:.4f} BTC\nTxs: {address_info['n_tx']}",
                    'full_address': search_address,
                    'expandable': True
                }
            })
            
            # Thêm các địa chỉ từ giao dịch
            for i, tx in enumerate(transactions[:5]):
                # Thêm các input addresses
                for j, input_addr in enumerate(tx.get('inputs', [])[:3]):
                    if 'addresses' in input_addr and input_addr['addresses']:
                        addr = input_addr['addresses'][0]
                        if addr != search_address:
                            node_id = addr  # dùng địa chỉ thật làm id để có thể expand
                            nodes.append({
                                'data': {
                                    'id': node_id,
                                    'label': f"{addr[:8]}...{addr[-6:]}",
                                    'type': 'input',
                                    'amount': f"{input_addr.get('output_value', 0) / 100000000:.4f} BTC",
                                    'full_address': addr,
                                    'expandable': True
                                }
                            })

                            edges.append({
                                'data': {
                                    'id': f"edge_in_{i}_{j}",
                                    'source': node_id,
                                    'target': search_address,
                                    'amount': f"{input_addr.get('output_value', 0) / 100000000:.4f} BTC",
                                    'time': tx.get('confirmed', 'Unconfirmed')[:10]
                                }
                            })

                # Thêm các output addresses  
                for j, output_addr in enumerate(tx.get('outputs', [])[:3]):
                    if 'addresses' in output_addr and output_addr['addresses']:
                        addr = output_addr['addresses'][0]
                        if addr != search_address:
                            node_id = addr
                            nodes.append({
                                'data': {
                                    'id': node_id,
                                    'label': f"{addr[:8]}...{addr[-6:]}",
                                    'type': 'output',
                                    'amount': f"{output_addr.get('value', 0) / 100000000:.4f} BTC",
                                    'full_address': addr,
                                    'expandable': True
                                }
                            })

                            edges.append({
                                'data': {
                                    'id': f"edge_out_{i}_{j}",
                                    'source': search_address,
                                    'target': node_id,
                                    'amount': f"{output_addr.get('value', 0) / 100000000:.4f} BTC",
                                    'time': tx.get('confirmed', 'Unconfirmed')[:10]
                                }
                            })
            
            return JsonResponse({
                'nodes': nodes,
                'edges': edges,
                'search_info': address_info
            })
    
    # Dữ liệu mẫu giống HashWei với các loại địa chỉ khác nhau (khi không tìm kiếm)
    nodes = [
    {"data": {"id": "coinbase1", "label": "Coinbase\n0xa9d1...3e43", "type": "exchange", "expandable": False}},
    {"data": {"id": "galaxy1", "label": "Galaxy Digital\n0x3356...5836", "type": "exchange", "expandable": False}},
    {"data": {"id": "bitstamp1", "label": "BitStamp Deposit Address\n0x1522...e428", "type": "exchange", "expandable": False}},
    {"data": {"id": "binance1", "label": "Binance\n0x9696...6776", "type": "exchange", "expandable": False}},
    {"data": {"id": "unknown1", "label": "Unknown\n0xe90c...a366", "type": "address", "expandable": False}},
    {"data": {"id": "unknown2", "label": "Unknown\n0x6b6e...83da", "type": "address", "expandable": False}},
    {"data": {"id": "unknown3", "label": "Unknown\n0x2943...1b77", "type": "address", "expandable": False}},
    {"data": {"id": "forwarder1", "label": "Forwarder\n0x864...3eff", "type": "address", "expandable": False}},
    {"data": {"id": "special1", "label": "Unknown\n0x0b0...4411", "type": "special", "expandable": False}},
    {"data": {"id": "deribit1", "label": "Deribit\n0x7702...83de", "type": "exchange", "expandable": False}},
    {"data": {"id": "kraken1", "label": "Kraken\n0x267b...fdc0", "type": "exchange", "expandable": False}},
    ]
    edges = [
        {"data": {"id": "e1", "source": "coinbase1", "target": "unknown1", "amount": "$540,575,335.44"}},
        {"data": {"id": "e2", "source": "galaxy1", "target": "unknown1", "amount": "$662,265,683.98"}},
        {"data": {"id": "e3", "source": "bitstamp1", "target": "unknown2", "amount": "$1,633,144,187.56"}},
        {"data": {"id": "e4", "source": "unknown1", "target": "unknown3", "amount": "$270,140,212.82"}},
        {"data": {"id": "e5", "source": "unknown2", "target": "forwarder1", "amount": "$1,311,939,452.37"}},
        {"data": {"id": "e6", "source": "forwarder1", "target": "binance1", "amount": "$794,936,630.12"}},
        {"data": {"id": "e7", "source": "binance1", "target": "special1", "amount": "$813,098,354.82"}},
        {"data": {"id": "e8", "source": "deribit1", "target": "unknown3", "amount": "$1,633,344,187.56"}},
        {"data": {"id": "e9", "source": "kraken1", "target": "unknown1", "amount": "$1,633,344,187.56"}},
    ]
    return JsonResponse({"nodes": nodes, "edges": edges})


def _is_valid_btc_address(address: str) -> bool:
    """Validate BTC address (basic regex for legacy/P2SH/bech32)."""
    import re
    return re.match(r"^(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[ac-hj-np-z02-9]{11,71})$", address) is not None


def expand_node(request):
    """
    API: GET /expand_node/?address=...&existing_addresses=a,b,c
    Trả về các nodes/edges mới liên quan tới address, tránh trùng với existing_addresses.
    Chiến lược đơn giản: lấy một số giao dịch gần nhất và thêm các input/output mới.
    """
    address = request.GET.get('address', '').strip()
    existing = request.GET.get('existing_addresses') or request.GET.get('existing_nodes') or ''
    existing_addresses = set(filter(None, unquote(existing).split(',')))

    if not address:
        return JsonResponse({'error': 'Thiếu address'}, status=400)
    if not _is_valid_btc_address(address):
        return JsonResponse({'error': 'Địa chỉ Bitcoin không hợp lệ'}, status=400)

    # Lấy thông tin địa chỉ để có balance
    info = search_bitcoin_address(address)
    txs = get_address_transactions(address, limit=5)

    nodes = []
    edges = []

    # Đảm bảo node chính tồn tại (nếu chưa có phía client)
    if address not in existing_addresses:
        if info:
            nodes.append({
                'data': {
                    'id': address,
                    'label': f"{address[:8]}...{address[-6:]}",
                    'type': 'address',
                    'balance': f"{info['balance']:.8f} BTC",
                    'full_address': address,
                    'expandable': True
                }
            })
        else:
            nodes.append({
                'data': {
                    'id': address,
                    'label': f"{address[:8]}...{address[-6:]}",
                    'type': 'address',
                    'full_address': address,
                    'expandable': True
                }
            })

    # Thêm các địa chỉ từ inputs/outputs của vài giao dịch
    added = set()
    for i, tx in enumerate(txs[:5]):
        # Inputs -> address
        for j, input_addr in enumerate(tx.get('inputs', [])[:3]):
            if 'addresses' in input_addr and input_addr['addresses']:
                addr = input_addr['addresses'][0]
                if addr and addr != address and addr not in existing_addresses and addr not in added:
                    nodes.append({
                        'data': {
                            'id': addr,
                            'label': f"{addr[:8]}...{addr[-6:]}",
                            'type': 'address',
                            'full_address': addr,
                            'expandable': True
                        }
                    })
                    added.add(addr)
                # Edge từ input -> address
                edges.append({
                    'data': {
                        'id': f"exp_in_{i}_{j}_{addr[-6:]}",
                        'source': addr,
                        'target': address,
                        'amount': f"{input_addr.get('output_value', 0) / 100000000:.4f} BTC",
                        'time': tx.get('confirmed', 'Unconfirmed')[:10]
                    }
                })

        # Outputs từ address -> others
        for j, output_addr in enumerate(tx.get('outputs', [])[:3]):
            if 'addresses' in output_addr and output_addr['addresses']:
                addr = output_addr['addresses'][0]
                if addr and addr != address and addr not in existing_addresses and addr not in added:
                    nodes.append({
                        'data': {
                            'id': addr,
                            'label': f"{addr[:8]}...{addr[-6:]}",
                            'type': 'address',
                            'full_address': addr,
                            'expandable': True
                        }
                    })
                    added.add(addr)
                edges.append({
                    'data': {
                        'id': f"exp_out_{i}_{j}_{addr[-6:]}",
                        'source': address,
                        'target': addr,
                        'amount': f"{output_addr.get('value', 0) / 100000000:.4f} BTC",
                        'time': tx.get('confirmed', 'Unconfirmed')[:10]
                    }
                })

    if not nodes and not edges:
        return JsonResponse({'error': 'Không tìm thấy dữ liệu mới để mở rộng'}, status=200)

    return JsonResponse({
        'message': f'From {address[:10]}...',
        'nodes': nodes,
        'edges': edges
    })

@csrf_exempt
@require_http_methods(["POST"])
def submit_report(request):
    """Xử lý form submission báo cáo địa chỉ/giao dịch đáng ngờ"""
    try:
        # Parse JSON data từ request
        data = json.loads(request.body)
        
        target_type = data.get('target_type', '').strip()
        target_value = data.get('target_value', '').strip()
        report_type = data.get('report_type', '').strip()
        description = data.get('description', '').strip()
        reporter_email = data.get('reporter_email', '').strip()
        
        # Validation cơ bản
        if not target_type or target_type not in ['address', 'transaction']:
            return JsonResponse({
                'success': False,
                'error': 'Loại báo cáo không hợp lệ'
            }, status=400)
        
        if not target_value:
            return JsonResponse({
                'success': False,
                'error': 'Vui lòng nhập địa chỉ ví hoặc transaction ID'
            }, status=400)
        
        if not report_type:
            return JsonResponse({
                'success': False,
                'error': 'Vui lòng chọn loại vấn đề'
            }, status=400)
        
        # Validate Bitcoin address hoặc transaction ID
        if target_type == 'address':
            if not _is_valid_btc_address(target_value):
                return JsonResponse({
                    'success': False,
                    'error': 'Địa chỉ Bitcoin không hợp lệ'
                }, status=400)
        elif target_type == 'transaction':
            # Validate transaction ID (64 ký tự hex)
            import re
            if not re.match(r'^[a-fA-F0-9]{64}$', target_value):
                return JsonResponse({
                    'success': False,
                    'error': 'Transaction ID không hợp lệ'
                }, status=400)
        
        # Lưu vào database
        if target_type == 'address':
            # Kiểm tra xem địa chỉ đã được báo cáo chưa
            existing_address = Address.objects.filter(address=target_value).first()
            if existing_address:
                return JsonResponse({
                    'success': False,
                    'error': f'Địa chỉ này đã được báo cáo với loại: {existing_address.report_type}'
                }, status=400)
            
            # Tạo báo cáo mới cho địa chỉ
            address_report = Address.objects.create(
                address=target_value,
                report_type=report_type,
                description=description,
                reporter_email=reporter_email or None
            )
            
            return JsonResponse({
                'success': True,
                'message': 'Báo cáo địa chỉ đã được gửi thành công',
                'report_id': address_report.id
            })
        
        elif target_type == 'transaction':
            # Kiểm tra xem giao dịch đã được báo cáo chưa
            existing_transaction = Transaction.objects.filter(txid=target_value).first()
            if existing_transaction:
                return JsonResponse({
                    'success': False,
                    'error': f'Giao dịch này đã được báo cáo với loại: {existing_transaction.report_type}'
                }, status=400)
            
            # Tạo báo cáo mới cho giao dịch
            transaction_report = Transaction.objects.create(
                txid=target_value,
                report_type=report_type,
                description=description,
                reporter_email=reporter_email or None
            )
            
            return JsonResponse({
                'success': True,
                'message': 'Báo cáo giao dịch đã được gửi thành công',
                'report_id': transaction_report.id
            })
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Dữ liệu JSON không hợp lệ'
        }, status=400)
    
    except Exception as e:
        print(f"Error in submit_report: {e}")
        return JsonResponse({
            'success': False,
            'error': 'Có lỗi xảy ra khi xử lý báo cáo'
        }, status=500)


def get_reported_addresses(request):
    """API để lấy danh sách địa chỉ đã được báo cáo"""
    # Lấy tất cả địa chỉ (bao gồm cả chưa xác minh)
    addresses = Address.objects.all().order_by('-created_at')[:100]
    
    data = []
    for addr in addresses:
        data.append({
            'id': addr.id,
            'address': addr.address,
            'report_type': addr.report_type,
            'description': addr.description,
            'created_at': addr.created_at.strftime('%Y-%m-%d %H:%M'),
            'is_verified': addr.is_verified
        })
    
    # Thêm thông tin về quyền của user hiện tại
    user_permissions = {
        'is_authenticated': request.user.is_authenticated,
        'is_staff': request.user.is_staff if request.user.is_authenticated else False
    }
    
    return JsonResponse({
        'addresses': data,
        'user_permissions': user_permissions
    })


def get_reported_transactions(request):
    """API để lấy danh sách giao dịch đã được báo cáo"""
    # Lấy tất cả giao dịch (bao gồm cả chưa xác minh)
    transactions = Transaction.objects.all().order_by('-created_at')[:100]
    
    data = []
    for tx in transactions:
        data.append({
            'id': tx.id,
            'txid': tx.txid,
            'report_type': tx.report_type,
            'description': tx.description,
            'created_at': tx.created_at.strftime('%Y-%m-%d %H:%M'),
            'is_verified': tx.is_verified
        })
    
    # Thêm thông tin về quyền của user hiện tại
    user_permissions = {
        'is_authenticated': request.user.is_authenticated,
        'is_staff': request.user.is_staff if request.user.is_authenticated else False
    }
    
    return JsonResponse({
        'transactions': data,
        'user_permissions': user_permissions
    })


@csrf_exempt
@require_http_methods(["POST"])
def update_address_status(request):
    """API để cập nhật trạng thái xác minh của địa chỉ (chỉ dành cho staff)"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({
            'success': False,
            'error': 'You do not have permission to perform this action'
        }, status=403)
    
    try:
        data = json.loads(request.body)
        address_id = data.get('address_id')
        is_verified = data.get('is_verified')
        
        if address_id is None or is_verified is None:
            return JsonResponse({
                'success': False,
                'error': 'Missing required information'
            }, status=400)
        
        address = Address.objects.get(id=address_id)
        address.is_verified = is_verified
        address.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Status updated successfully'
        })
    
    except Address.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Address report not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': 'An error occurred while updating'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def update_transaction_status(request):
    """API để cập nhật trạng thái xác minh của giao dịch (chỉ dành cho staff)"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({
            'success': False,
            'error': 'You do not have permission to perform this action'
        }, status=403)
    
    try:
        data = json.loads(request.body)
        transaction_id = data.get('transaction_id')
        is_verified = data.get('is_verified')
        
        if transaction_id is None or is_verified is None:
            return JsonResponse({
                'success': False,
                'error': 'Missing required information'
            }, status=400)
        
        transaction = Transaction.objects.get(id=transaction_id)
        transaction.is_verified = is_verified
        transaction.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Status updated successfully'
        })
    
    except Transaction.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Transaction report not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': 'An error occurred while updating'
        }, status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_address_report(request, address_id):
    """API để xóa báo cáo địa chỉ (chỉ dành cho staff)"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({
            'success': False,
            'error': 'You do not have permission to perform this action'
        }, status=403)
    
    try:
        address = Address.objects.get(id=address_id)
        address.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Address report deleted successfully'
        })
    
    except Address.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Address report not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': 'An error occurred while deleting'
        }, status=500)


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_transaction_report(request, transaction_id):
    """API để xóa báo cáo giao dịch (chỉ dành cho staff)"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return JsonResponse({
            'success': False,
            'error': 'You do not have permission to perform this action'
        }, status=403)
    
    try:
        transaction = Transaction.objects.get(id=transaction_id)
        transaction.delete()
        
        return JsonResponse({
            'success': True,
            'message': 'Transaction report deleted successfully'
        })
    
    except Transaction.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Transaction report not found'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': 'An error occurred while deleting'
        }, status=500)


def _fetch_from_blockcypher(address, limit=50, offset=0):
    """Fetch transaction data from BlockCypher API as fallback"""
    try:
        # BlockCypher uses 'before' parameter instead of offset for pagination
        url = f"https://api.blockcypher.com/v1/btc/main/addrs/{address}/full?limit={limit}"
        if offset > 0:
            # For simplicity, we'll just get the first page when offset > 0
            # BlockCypher pagination works differently with 'before' parameter
            pass
            
        print(f"DEBUG: Calling BlockCypher API URL: {url}")
        response = requests.get(url, timeout=30)
        print(f"DEBUG: BlockCypher API response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            txs = data.get('txs', [])
            print(f"DEBUG: BlockCypher received {len(txs)} transactions")
            
            # Process transaction data to match our format
            transactions = []
            for i, tx in enumerate(txs[:limit]):  # Limit to requested number
                try:
                    print(f"DEBUG: Processing BlockCypher transaction {i+1}/{len(txs)}: {tx.get('hash', 'unknown')}")
                    
                    # Calculate input/output values for this address
                    inputs_value = 0
                    outputs_value = 0
                    found_address = False
                    
                    # Check inputs
                    for inp in tx.get('inputs', []):
                        inp_addresses = inp.get('addresses') or []
                        for addr in inp_addresses:
                            if addr == address:
                                inputs_value += inp.get('output_value', 0)
                                found_address = True
                    
                    # Check outputs
                    for out in tx.get('outputs', []):
                        out_addresses = out.get('addresses') or []
                        for addr in out_addresses:
                            if addr == address:
                                outputs_value += out.get('value', 0)
                                found_address = True
                    
                    # Skip transactions that don't involve this address
                    if not found_address:
                        continue
                    
                    # Determine transaction type and net change
                    net_change = outputs_value - inputs_value
                    tx_type = 'Received' if net_change > 0 else 'Sent'
                    
                    # Convert timestamp to readable date
                    tx_time = 0
                    tx_date = 'Unknown'
                    if tx.get('received'):
                        try:
                            # BlockCypher returns ISO format datetime
                            dt = datetime.fromisoformat(tx['received'].replace('Z', '+00:00'))
                            tx_time = int(dt.timestamp())
                            tx_date = dt.strftime('%Y-%m-%d %H:%M:%S')
                        except Exception as date_error:
                            print(f"DEBUG: Date parsing error: {date_error}")
                            pass
                    
                    transactions.append({
                        'hash': tx.get('hash', ''),
                        'time': tx_time,
                        'date': tx_date,
                        'type': tx_type,
                        'value_satoshis': abs(net_change),
                        'value_btc': abs(net_change) / 100000000,
                        'fee': tx.get('fees', 0),
                        'size': tx.get('size', 0),
                        'block_height': tx.get('block_height', 0),
                        'inputs_count': len(tx.get('inputs', [])),
                        'outputs_count': len(tx.get('outputs', [])),
                        'confirmed': tx.get('block_height', 0) > 0
                    })
                    
                except Exception as tx_error:
                    print(f"DEBUG: Error processing BlockCypher transaction {i+1}: {tx_error}")
                    traceback.print_exc()
                    continue
            
            print(f"DEBUG: BlockCypher successfully processed {len(transactions)} transactions")
            
            return {
                'success': True,
                'address': address,
                'address_info': {
                    'hash160': '',  # BlockCypher doesn't provide hash160
                    'n_tx': data.get('n_tx', 0),
                    'n_unredeemed': data.get('unconfirmed_n_tx', 0),
                    'total_received': data.get('total_received', 0) / 100000000,
                    'total_sent': data.get('total_sent', 0) / 100000000,
                    'final_balance': data.get('final_balance', 0) / 100000000
                },
                'transactions': transactions,
                'pagination': {
                    'limit': limit,
                    'offset': offset,
                    'total_transactions': data.get('n_tx', 0),
                    'has_more': len(transactions) == limit
                },
                'api_source': 'BlockCypher'
            }
        else:
            print(f"DEBUG: BlockCypher API error - Status: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"DEBUG: BlockCypher API exception: {e}")
        return None


def get_address_transactions_detailed(request):
    """API để lấy chi tiết giao dịch của một địa chỉ Bitcoin"""
    
    address = request.GET.get('address', '').strip()
    limit = request.GET.get('limit', 50)
    offset = request.GET.get('offset', 0)
    
    print(f"DEBUG: Processing request for address={address}, limit={limit}, offset={offset}")
    
    if not address:
        return JsonResponse({
            'success': False,
            'error': 'Address parameter is required'
        }, status=400)
    
    if not _is_valid_btc_address(address):
        print(f"DEBUG: Invalid Bitcoin address: {address}")
        return JsonResponse({
            'success': False,
            'error': 'Invalid Bitcoin address'
        }, status=400)
    
    try:
        # Validate limit and offset
        limit = min(int(limit), 50)  # Max 50 as per API docs
        offset = int(offset)
        
        # Try Blockchain.info API first
        url = f"https://blockchain.info/rawaddr/{address}?limit={limit}&offset={offset}"
        print(f"DEBUG: Calling Blockchain.info API URL: {url}")
        
        try:
            response = requests.get(url, timeout=30)
            print(f"DEBUG: Blockchain.info API response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"DEBUG: Blockchain.info received {len(data.get('txs', []))} transactions")
                
                # Process transaction data
                transactions = []
                for i, tx in enumerate(data.get('txs', [])):
                    try:
                        print(f"DEBUG: Processing Blockchain.info transaction {i+1}/{len(data.get('txs', []))}: {tx.get('hash', 'unknown')}")
                        
                        # Calculate input/output values for this address
                        inputs_value = 0
                        outputs_value = 0
                        
                        # Check inputs
                        for inp in tx.get('inputs', []):
                            prev_out = inp.get('prev_out', {})
                            if prev_out.get('addr') == address:
                                inputs_value += prev_out.get('value', 0)
                        
                        # Check outputs
                        for out in tx.get('out', []):
                            if out.get('addr') == address:
                                outputs_value += out.get('value', 0)
                        
                        # Determine transaction type and net change
                        net_change = outputs_value - inputs_value
                        tx_type = 'Received' if net_change > 0 else 'Sent'
                        
                        # Convert timestamp to readable date - handle None/0 timestamps
                        tx_time = tx.get('time', 0)
                        if tx_time and tx_time > 0:
                            tx_date = datetime.utcfromtimestamp(tx_time).strftime('%Y-%m-%d %H:%M:%S')
                        else:
                            tx_date = 'Unknown'
                        
                        transactions.append({
                            'hash': tx.get('hash', ''),
                            'time': tx_time,
                            'date': tx_date,
                            'type': tx_type,
                            'value_satoshis': abs(net_change),
                            'value_btc': abs(net_change) / 100000000,
                            'fee': tx.get('fee', 0),
                            'size': tx.get('size', 0),
                            'block_height': tx.get('block_height', 0),
                            'inputs_count': len(tx.get('inputs', [])),
                            'outputs_count': len(tx.get('out', [])),
                            'confirmed': tx.get('block_height', 0) > 0
                        })
                        
                    except Exception as tx_error:
                        print(f"DEBUG: Error processing Blockchain.info transaction {i+1}: {tx_error}")
                        continue  # Skip this transaction and continue with others
                
                print(f"DEBUG: Blockchain.info successfully processed {len(transactions)} transactions")
                
                return JsonResponse({
                    'success': True,
                    'address': address,
                    'address_info': {
                        'hash160': data.get('hash160', ''),
                        'n_tx': data.get('n_tx', 0),
                        'n_unredeemed': data.get('n_unredeemed', 0),
                        'total_received': data.get('total_received', 0) / 100000000,
                        'total_sent': data.get('total_sent', 0) / 100000000,
                        'final_balance': data.get('final_balance', 0) / 100000000
                    },
                    'transactions': transactions,
                    'pagination': {
                        'limit': limit,
                        'offset': offset,
                        'total_transactions': data.get('n_tx', 0),
                        'has_more': len(transactions) == limit
                    },
                    'api_source': 'Blockchain.info'
                })
            else:
                # Blockchain.info failed, try BlockCypher as fallback
                print(f"DEBUG: Blockchain.info failed with status {response.status_code}, trying BlockCypher fallback...")
                raise Exception(f"Blockchain.info API error: {response.status_code}")
                
        except Exception as blockchain_error:
            print(f"DEBUG: Blockchain.info error: {blockchain_error}")
            print(f"DEBUG: Trying BlockCypher API as fallback...")
            
            # Try BlockCypher API as fallback
            blockcypher_result = _fetch_from_blockcypher(address, limit, offset)
            
            if blockcypher_result and blockcypher_result['success']:
                print(f"DEBUG: BlockCypher fallback successful")
                return JsonResponse(blockcypher_result)
            else:
                print(f"DEBUG: BlockCypher fallback also failed")
                # Both APIs failed
                if 'rate limit' in str(blockchain_error).lower() or '429' in str(blockchain_error):
                    return JsonResponse({
                        'success': False,
                        'error': 'API rate limit exceeded. Please try again later.',
                        'error_code': 'RATE_LIMIT'
                    }, status=429)
                elif '404' in str(blockchain_error):
                    return JsonResponse({
                        'success': False,
                        'error': 'Address not found or has no transactions',
                        'error_code': 'NOT_FOUND'
                    }, status=404)
                else:
                    return JsonResponse({
                        'success': False,
                        'error': 'Both Blockchain.info and BlockCypher APIs failed. Please try again later.',
                        'error_code': 'ALL_APIS_FAILED'
                    }, status=503)
            
    except ValueError as ve:
        print(f"DEBUG: ValueError: {ve}")
        return JsonResponse({
            'success': False,
            'error': 'Invalid limit or offset parameter',
            'error_code': 'INVALID_PARAMS'
        }, status=400)
        
    except Exception as e:
        print(f"DEBUG: Unexpected error in get_address_transactions_detailed: {e}")
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': 'An unexpected error occurred while fetching transaction data',
            'error_code': 'UNEXPECTED_ERROR'
        }, status=500)