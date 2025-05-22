from flask_socketio import emit
from flask import current_app, request
from rag.chat import ChatManager
from models.chat_session import ChatSession
from datetime import datetime
from bson import ObjectId
import threading
import os

def init_socket_handlers(socketio):
    """
    Khởi tạo các event handlers cho WebSocket
    """
    chat_manager = ChatManager()

    @socketio.on('connect')
    @staticmethod
    def handle_connect():
        client_id = request.sid
        print(f'Client kết nối thành công! ID: {client_id}')
        emit('connection_confirmed', {
            'status': 'success',
            'message': 'Kết nối với server thành công!',
            'client_id': client_id
        })

    @socketio.on('disconnect')
    @staticmethod
    def handle_disconnect():
        client_id = request.sid
        print(f'Client ngắt kết nối! ID: {client_id}')
        
    @socketio.on('ping')
    def handle_ping():
        emit('pong', {
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'active'
        })
        
    @socketio.on('keepalive')
    def handle_keepalive():
        emit('still_connected', {
            'timestamp': datetime.utcnow().isoformat(),
            'status': 'connected'
        })

    @socketio.on('chat_message')
    def handle_message(data):
        try:
            db = current_app.config['db']
            message = data.get('message', '')
            session_id = data.get('session_id')
            user_id = data.get('user_id')

            chat_session = None
            if session_id:
                try:
                    session_id_obj = ObjectId(session_id) if session_id else None
                    chat_session = db.chat_sessions.find_one({'_id': session_id_obj})
                except Exception as e:
                    print(f"Lỗi khi tìm session: {str(e)}")
            
            if not chat_session:
                chat_session = ChatSession(
                    user_id=user_id,
                    created_at=datetime.utcnow(),
                    messages=[]
                ).to_dict()
                result = db.chat_sessions.insert_one(chat_session)
                session_id = str(result.inserted_id)

            db.chat_sessions.update_one(
                {'_id': ObjectId(session_id)},
                {'$push': {'messages': {
                    'role': 'user',
                    'content': message,
                    'timestamp': datetime.utcnow()
                }}}
            )

            response_content = ""
            
            def stream_callback(token):
                nonlocal response_content
                response_content += token
                emit('chat_response', {
                    'token': token,
                    'session_id': session_id,
                    'finished': False
                })

            try:
                full_response = chat_manager.process_message(
                    message, 
                    session_id,
                    stream_callback=stream_callback
                )
                if not response_content and full_response:
                    response_content = full_response
            except Exception as e:
                error_message = f"Lỗi khi xử lý tin nhắn: {str(e)}"
                emit('error', {'error': error_message})
                response_content = "Xin lỗi, đã xảy ra lỗi khi xử lý tin nhắn của bạn."

            db.chat_sessions.update_one(
                {'_id': ObjectId(session_id)},
                {'$push': {'messages': {
                    'role': 'assistant',
                    'content': response_content,
                    'timestamp': datetime.utcnow()
                }}}
            )

            emit('chat_response', {
                'token': '',
                'session_id': session_id,
                'finished': True,
                'full_response': response_content
            })

        except Exception as e:
            error_message = f"Lỗi hệ thống: {str(e)}"
            print(error_message)
            emit('error', {'error': error_message})

    @socketio.on('admin_create_vector_db')
    def handle_create_vector_db_request(data):
        """Xử lý yêu cầu tạo vector database từ client (Admin)."""
        client_id = request.sid
        print(f"Nhận yêu cầu tạo Vector DB từ client: {client_id}")

        data_path = os.path.join(current_app.root_path, '../data/products_data.json')
        output_path = os.path.join(current_app.root_path, '../vector_db')

        if not os.path.exists(data_path):
            emit('vector_db_progress', {
                'status': 'error',
                'message': f'Lỗi: Không tìm thấy tệp dữ liệu nguồn tại {data_path}'
            }, room=client_id)
            return

        def stream_progress_to_client(message):
            """Callback để gửi tiến trình về client qua SocketIO."""
            socketio.emit('vector_db_progress', {
                'status': 'processing',
                'message': message
            }, room=client_id)
            socketio.sleep(0.05)

        def run_db_creation():
            """Hàm chạy trong luồng riêng biệt."""
            try:
                stream_progress_to_client(f"Bắt đầu quá trình tạo Vector DB từ {data_path}...")
                db = create_vector_database(data_path, output_path, stream_callback=stream_progress_to_client)

                if db:
                    socketio.emit('vector_db_progress', {
                        'status': 'completed',
                        'message': f'Hoàn thành tạo Vector DB tại {output_path}'
                    }, room=client_id)
                else:
                    socketio.emit('vector_db_progress', {
                        'status': 'error',
                        'message': 'Quá trình tạo Vector DB gặp lỗi. Vui lòng kiểm tra log server.'
                    }, room=client_id)

            except Exception as e:
                error_message = f"Lỗi nghiêm trọng khi chạy tạo Vector DB: {str(e)}"
                print(error_message)

                socketio.emit('vector_db_progress', {
                    'status': 'error',
                    'message': error_message
                }, room=client_id)

        thread = threading.Thread(target=run_db_creation)
        thread.start()

        emit('vector_db_progress', {
            'status': 'started',
            'message': 'Đã bắt đầu quá trình tạo Vector DB trong nền...'
        }, room=client_id) 