import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from './AuthContext';

// Define types
export type CartItem = {
  product_id: string;
  title: string;
  price: string; // Giá từ server có thể là string
  quantity: number;
  image_path?: string;
};

export type Cart = {
  id: string; // _id từ MongoDB
  user_id?: string;
  session_id?: string;
  items: CartItem[];
  total: string; // Tổng tiền, server sẽ tính và trả về dạng string
  created_at: string;
  updated_at: string;
  is_anonymous?: boolean;
  total_items?: number;
};

type CartContextType = {
  cart: Cart | null;
  isLoading: boolean;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>; // Sẽ gọi API để xóa trên server
  refreshCart: () => Promise<void>;
  // session_id không cần thiết phải export ra ngoài nếu chỉ dùng nội bộ
};

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider component
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, token } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Generate or retrieve a session ID for anonymous users
  useEffect(() => {
    const initializeSession = async () => {
      let sid = await AsyncStorage.getItem('session_id');
      if (!sid) {
        sid =
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);
        await AsyncStorage.setItem('session_id', sid);
      }
      setSessionId(sid);
    };
    initializeSession();
  }, []);

  // Load or create cart on app start or when session/user changes
  useEffect(() => {
    if (sessionId || token) {
      // Chỉ load cart khi có sessionId hoặc token
      loadCart();
    }
  }, [user, token, sessionId]);

  const loadCart = async () => {
    try {
      setIsLoading(true);
      // Try to load cart from storage first (for offline support)
      const storedCart = await AsyncStorage.getItem('cart');
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
      // Then try to get cart from server
      await refreshCart(); // refreshCart sẽ sử dụng sessionId từ state
    } catch (error) {
      console.error('Failed to load cart', error);
      // Có thể không set cart về null ở đây để giữ lại dữ liệu offline nếu có
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh cart from server
  const refreshCart = async () => {
    if (!sessionId && !token) {
      // console.log("Refresh cart: No session ID or token, cannot fetch cart.");
      // Nếu không có session ID và không có token, không thể fetch cart
      // Có thể tạo một cart rỗng tạm thời cho client nếu cần
      const emptyCart: Cart = {
        id: '', // Hoặc một ID tạm thời nếu cần
        items: [],
        total: '0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        session_id: sessionId || undefined, // Gán session_id nếu có
        user_id: user ? user.id : undefined,
        is_anonymous: !user,
        total_items: 0,
      };
      setCart(emptyCart);
      await AsyncStorage.setItem('cart', JSON.stringify(emptyCart));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (sessionId) headers['X-Session-ID'] = sessionId;

      // API_URL đã bao gồm /api, nên không cần thêm /api ở đây nữa
      const response = await axios.get(`${API_URL}/cart/`, { headers });

      // Server trả về { cart: Cart, session_id: string }
      const cartData = response.data.cart as Cart;
      const newSessionId = response.data.session_id;

      setCart(cartData);
      if (newSessionId && newSessionId !== sessionId) {
        setSessionId(newSessionId);
        await AsyncStorage.setItem('session_id', newSessionId);
      }
      // Save to storage for offline access
      await AsyncStorage.setItem('cart', JSON.stringify(cartData));
    } catch (error) {
      console.error('Failed to refresh cart', error);
      // Nếu lỗi, có thể không clear cart đã có từ local storage
      // hoặc xử lý tạo cart rỗng nếu server trả 404 (ví dụ)
    } finally {
      setIsLoading(false);
    }
  };

  // Add item to cart
  const addToCart = async (productId: string, quantity: number) => {
    if (!sessionId && !token) {
      console.error('Add to cart: No session ID or token.');
      throw new Error('Cannot add to cart without session or user.');
    }
    try {
      setIsLoading(true);
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (sessionId) headers['X-Session-ID'] = sessionId;

      const response = await axios.post(
        `${API_URL}/cart/items`, // Endpoint: POST /cart/items
        { product_id: productId, quantity },
        { headers },
      );

      const cartData = response.data.cart as Cart;
      setCart(cartData);
      await AsyncStorage.setItem('cart', JSON.stringify(cartData));
    } catch (error) {
      console.error('Failed to add item to cart', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove item from cart
  const removeFromCart = async (productId: string) => {
    if (!sessionId && !token) {
      console.error('Remove from cart: No session ID or token.');
      throw new Error('Cannot remove from cart without session or user.');
    }
    try {
      setIsLoading(true);
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (sessionId) headers['X-Session-ID'] = sessionId;

      const response = await axios.delete(
        `${API_URL}/cart/items/${productId}`, // Endpoint: DELETE /cart/items/:productId
        { headers },
      );

      const cartData = response.data.cart as Cart;
      setCart(cartData);
      await AsyncStorage.setItem('cart', JSON.stringify(cartData));
    } catch (error) {
      console.error('Failed to remove item from cart', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (productId: string, quantity: number) => {
    if (!sessionId && !token) {
      console.error('Update quantity: No session ID or token.');
      throw new Error('Cannot update quantity without session or user.');
    }
    try {
      setIsLoading(true);
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (sessionId) headers['X-Session-ID'] = sessionId;

      // Nếu quantity là 0, API backend sẽ tự động xóa sản phẩm
      const response = await axios.put(
        `${API_URL}/cart/items/${productId}`, // Endpoint: PUT /cart/items/:productId
        { quantity },
        { headers },
      );

      const cartData = response.data.cart as Cart;
      setCart(cartData);
      await AsyncStorage.setItem('cart', JSON.stringify(cartData));
    } catch (error) {
      console.error('Failed to update item quantity', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear cart on server
  const clearCart = async () => {
    if (!sessionId && !token) {
      console.error('Clear cart: No session ID or token.');
      // Nếu không có session/token, chỉ cần xóa local cart
      const emptyCart: Cart = {
        id: cart?.id || '', // Giữ lại id nếu có
        items: [],
        total: '0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        session_id: sessionId || undefined,
        user_id: user ? user.id : undefined,
        is_anonymous: !user,
        total_items: 0,
      };
      setCart(emptyCart);
      await AsyncStorage.setItem('cart', JSON.stringify(emptyCart));
      return;
    }

    try {
      setIsLoading(true);
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (sessionId) headers['X-Session-ID'] = sessionId;

      const response = await axios.delete(
        `${API_URL}/cart/items/clear`, // Endpoint: DELETE /cart/items/clear
        { headers },
      );

      const cartData = response.data.cart as Cart; // Server sẽ trả về cart rỗng
      setCart(cartData);
      await AsyncStorage.setItem('cart', JSON.stringify(cartData));
    } catch (error) {
      console.error('Failed to clear cart on server', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    cart,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart, // Đã cập nhật clearCart để gọi API
    refreshCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// Custom hook to use the cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
