from flask import Blueprint, jsonify, request, current_app, Response, stream_with_context, g
from bson import ObjectId
from models.chat_session import ChatSession
import uuid
import jwt as PyJWT
import config
from rag.chat import ChatManager
import json
import time
from datetime import datetime
import threading
import queue

chat_bp = Blueprint('chat', __name__)
chat_manager = ChatManager()

session_stream_queues = {}
queues_lock = threading.Lock()

@chat_bp.route('/sessions', methods=['GET'])
@chat_bp.route('/sessions/<session_id>', methods=['GET'])
def get_chat_session(session_id=None):
    """Get or create a chat session"""
    db = current_app.config['db']
    
    user_id = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        try:
            payload = PyJWT.decode(token, config.JWT_SECRET_KEY, algorithms=['HS256'])
            user_id = payload['sub']
        except:
            pass
    
    if not session_id:
        session_id = request.headers.get('X-Session-ID')
    
    chat_data = None
    if session_id:
        chat_data = db.chat_sessions.find_one({"session_id": session_id})
    elif user_id:
        chat_data = db.chat_sessions.find_one({"user_id": user_id})
    
    if session_id and not chat_data:
        return jsonify({"error": "Chat session not found"}), 404
    
    if not chat_data and not session_id:
        session_id = str(uuid.uuid4())
        
        cart_id = None
        cart_data = None
        if user_id:
            cart_data = db.carts.find_one({"user_id": user_id})
        elif session_id:
            cart_data = db.carts.find_one({"session_id": session_id})
        
        if cart_data:
            cart_id = str(cart_data["_id"])
        
        chat_session = ChatSession(
            user_id=user_id, 
            session_id=session_id, 
            is_anonymous=(user_id is None),
            cart_id=cart_id
        )
        
        chat_session.add_message("assistant", "Xin chào, mình là trợ giúp mua sắm của bạn. Hôm nay bạn mua gì?")
        
        result = db.chat_sessions.insert_one(chat_session.to_dict())
        chat_session.id = str(result.inserted_id)
        
        return jsonify({
            "chat_session": chat_session.to_json(),
            "session_id": session_id
        }), 200
    
    chat_session = ChatSession.from_dict(chat_data)
    return jsonify({
        "chat_session": chat_session.to_json(),
        "session_id": chat_session.session_id
    }), 200

@chat_bp.route('/stream', methods=['GET'])
def stream_response():
    """
    Endpoint SSE để stream phản hồi từ LLM sử dụng Queue.
    """
    session_id = request.args.get('session_id')
    if not session_id:
        return jsonify({"error": "Session ID is required"}), 400

    q = queue.Queue()
    with queues_lock:
        session_stream_queues[session_id] = q
    current_app.logger.info(f"SSE stream opened for session: {session_id}")

    def generate():
        try:
            yield f"data: {json.dumps({'type':'connection','status':'connected','session_id': session_id})}\n\n"

            while True:
                try:
                    token = q.get(timeout=600)

                    if token is None:
                        current_app.logger.info(f"End signal received for session: {session_id}")
                        yield f"data: {json.dumps({'token': '', 'session_id': session_id, 'finished': True})}\n\n"
                        break
                    else:
                        data = json.dumps({
                            "token": token,
                            "session_id": session_id,
                            "finished": False
                        })
                        yield f"data: {data}\n\n"

                except queue.Empty:
                    current_app.logger.warning(f"SSE stream timeout for session: {session_id}")
                    yield f"data: {json.dumps({'token': '', 'session_id': session_id, 'finished': True, 'error': 'timeout'})}\n\n"
                    break

        except GeneratorExit:
            current_app.logger.info(f"SSE client disconnected for session: {session_id}")
        except Exception as e:
            current_app.logger.error(f"Error in SSE generator for session {session_id}: {e}")
            try:
                 yield f"data: {json.dumps({'token': '', 'session_id': session_id, 'finished': True, 'error': str(e)})}\n\n"
            except:
                 pass
        finally:
            with queues_lock:
                if session_id in session_stream_queues:
                    del session_stream_queues[session_id]
                    current_app.logger.info(f"Cleaned up queue for session: {session_id}")


    response = Response(stream_with_context(generate()), mimetype="text/event-stream")
    response.headers["Cache-Control"] = "no-cache"
    response.headers["X-Accel-Buffering"] = "no"
    response.headers["Connection"] = "keep-alive"
    return response

@chat_bp.route('/message', methods=['POST'])
def send_message():
    """
    Endpoint để gửi tin nhắn và kích hoạt quá trình xử lý nền.
    """
    data = request.json
    message = data.get('message')
    session_id = data.get('session_id')

    if not message or not session_id:
        return jsonify({"error": "Message and session_id are required"}), 400

    db = current_app.config['db']
    flask_app = current_app._get_current_object()

    chat_data = db.chat_sessions.find_one({"session_id": session_id})

    if not chat_data:
        return jsonify({"error": "Chat session not found"}), 404

    try:
        db.chat_sessions.update_one(
            {'session_id': session_id},
            {'$push': {'messages': {
                'role': 'user',
                'content': message,
                'timestamp': datetime.utcnow()
            }}}
        )
    except Exception as e:
        current_app.logger.error(f"Error saving user message for session {session_id}: {e}")
        return jsonify({"error": "Failed to save user message"}), 500

    def process_async_with_context(app, message_content, session_identifier):
        with app.app_context():
            def queue_stream_callback(token):
                with queues_lock:
                    q = session_stream_queues.get(session_identifier)
                if q:
                    try:
                        q.put(token)
                    except Exception as e:
                        current_app.logger.error(f"Error putting token in queue for {session_identifier}: {e}")

            try:
                db_inside_context = current_app.config['db']

                full_response = chat_manager.process_message(
                    message_content,
                    session_identifier,
                    stream_callback=queue_stream_callback
                )

                db_inside_context.chat_sessions.update_one(
                    {'session_id': session_identifier},
                    {'$push': {'messages': {
                        'role': 'assistant',
                        'content': full_response,
                        'timestamp': datetime.utcnow()
                    }}}
                )
                current_app.logger.info(f"Assistant response saved for session: {session_identifier}")

            except Exception as e:
                current_app.logger.error(f"Error processing message in thread for session {session_identifier}: {str(e)}")
                with queues_lock:
                    q = session_stream_queues.get(session_identifier)
                if q:
                    try:
                        q.put(f"__ERROR__: {str(e)}")
                    except Exception as err_put:
                        current_app.logger.error(f"Error putting error token in queue for {session_identifier}: {err_put}")

            finally:
                with queues_lock:
                    q = session_stream_queues.get(session_identifier)
                if q:
                    try:
                        q.put(None)
                        current_app.logger.info(f"Put end signal in queue for session: {session_identifier}")
                    except Exception as e_put_none:
                        current_app.logger.error(f"Error putting None (end signal) in queue for {session_identifier}: {e_put_none}")


    thread = threading.Thread(target=process_async_with_context, args=(flask_app, message, session_id))
    thread.start()

    return jsonify({"status": "processing", "session_id": session_id}), 202

