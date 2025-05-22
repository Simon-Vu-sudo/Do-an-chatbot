import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { API_URL } from '../config';
import EventSource from 'react-native-sse';

// Định nghĩa các kiểu dữ liệu
type Message = {
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
};

type ChatSession = {
  id: string;
  user_id: string | null;
  session_id: string;
  is_anonymous: boolean;
  cart_id: string | null;
  messages: Message[];
};

type ChatContextType = {
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;
  isConnected: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => Promise<void>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);
  const tempResponseRef = useRef<string>('');

  useEffect(() => {
    initChatSession();

    return () => {
      closeEventSource();
    };
  }, [token]);

  const closeEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  // Lấy hoặc tạo session ID cho người dùng ẩn danh
  const getSessionId = async () => {
    let sessionId = await AsyncStorage.getItem('chat_session_id');
    if (!sessionId) {
      sessionId = Date.now().toString();
      await AsyncStorage.setItem('chat_session_id', sessionId);
    }
    return sessionId;
  };

  // Tạo headers cho API requests
  const getHeaders = async () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      const sessionId = await getSessionId();
      headers['X-Session-ID'] = sessionId;
    }

    return headers;
  };

  // Khởi tạo chat session
  const initChatSession = async () => {
    try {
      setIsLoading(true);
      const headers = await getHeaders();

      const response = await fetch(`${API_URL}/chat/sessions`, {
        headers,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setChatSession(data.chat_session);
      setMessages(data.chat_session.messages);

      await AsyncStorage.setItem(
        'chat_session',
        JSON.stringify(data.chat_session),
      );
    } catch (error) {
      console.error('Lỗi khởi tạo chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Thiết lập kết nối SSE cho chat
  const setupSSEConnection = async (sessionId: string) => {
    closeEventSource(); // Đóng kết nối cũ

    const sseUrl = `${API_URL}/chat/stream?session_id=${sessionId}`;
    console.log('Thiết lập kết nối SSE tại:', sseUrl);

    const eventSource = new EventSource(sseUrl, {
      /* headers, timeout, etc. */
    });
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('open', (event) => {
      console.log('SSE kết nối thành công', event);
      setIsConnected(true);
    });

    // LẮNG NGHE SỰ KIỆN 'message' TỪ SERVER
    eventSource.addEventListener('message', (event: any) => {
      try {
        console.log('Nhận SSE message:', event.data);
        const data = JSON.parse(event.data); // Dữ liệu từ server là JSON string
        console.log('Received token on FE:', JSON.stringify(data.token));
        if (data.token) {
          tempResponseRef.current += data.token; // Cộng dồn token
          // Cập nhật tin nhắn cuối cùng (nếu là của assistant) hoặc thêm tin nhắn mới
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            const lastMsg = updatedMessages[updatedMessages.length - 1];

            if (lastMsg && lastMsg.role === 'assistant') {
              // Cập nhật nội dung của tin nhắn cuối cùng
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMsg,
                content: tempResponseRef.current, // Hiển thị nội dung đã cộng dồn
              };
            } else {
              // Nếu chưa có tin nhắn assistant hoặc tin nhắn cuối là của user,
              // thêm một tin nhắn assistant mới
              updatedMessages.push({
                role: 'assistant',
                content: tempResponseRef.current,
                timestamp: new Date().toISOString(),
              });
            }
            return updatedMessages;
          });
        }

        if (data.finished === true) {
          // Nếu server báo đã hoàn thành
          console.log('SSE phản hồi hoàn thành');
          tempResponseRef.current = ''; // Reset biến tạm
          setIsSending(false); // Đánh dấu đã gửi xong (để cho phép gửi tin nhắn mới)
          // Có thể bạn muốn lưu trữ full_response từ server nếu có ở đây
        }
      } catch (error) {
        console.error('Lỗi xử lý dữ liệu SSE:', error);
      }
    });

    eventSource.addEventListener('error', (error: any) => {
      // ... (xử lý lỗi SSE) ...
    });
  };

  // Gửi tin nhắn
  const sendMessage = async (content: string) => {
    try {
      setIsSending(true);
      const headers = await getHeaders();
      const sessionId = chatSession?.session_id || (await getSessionId());

      // Thêm tin nhắn người dùng vào state ngay lập tức
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        },
      ]);

      // Đảm bảo kết nối SSE đã được thiết lập trước khi gửi tin nhắn
      await setupSSEConnection(sessionId);

      console.log('Gửi tin nhắn:', content, 'cho phiên:', sessionId);

      // Gửi tin nhắn qua API
      const response = await fetch(`${API_URL}/chat/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: content,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi khi gửi tin nhắn');
      }

      console.log('Tin nhắn đã được gửi thành công, đang chờ phản hồi...');
    } catch (error) {
      console.error('Lỗi gửi tin nhắn:', error);
      setIsSending(false);
      closeEventSource();

      // Thêm tin nhắn lỗi vào chat
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Xin lỗi, đã xảy ra lỗi khi xử lý tin nhắn của bạn.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // Xóa chat
  const clearChat = async () => {
    setMessages([]);
    await AsyncStorage.removeItem('chat_session');
    await initChatSession();
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        isSending,
        isConnected,
        sendMessage,
        clearChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat phải được sử dụng trong ChatProvider');
  }
  return context;
};
