import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCart, CartItem as ContextCartItem } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../../App';
import { MainTabParamList } from '../../App'; // Import MainTabParamList
import { API_URL } from '../config';
// Giả sử HomeStackParamList được định nghĩa ở App.tsx hoặc một file types chung
// và CartScreen có thể điều hướng đến ProductDetail
// import { HomeStackParamList } from '../../App'; // Điều chỉnh path nếu cần
// import { API_URL } from '../config'; // Sẽ dùng khi tích hợp API

// Định nghĩa kiểu cho một item trong giỏ hàng (frontend)
interface CartItemDisplay extends ContextCartItem {
  // product_id, title, price (string), quantity, image_path đã có từ ContextCartItem
  // price cần chuyển sang number để tính toán nếu cần, nhưng context đã có total
}

// Navigation prop cho CartScreen
type CartScreenCombinedParamList = RootStackParamList & {
  Main: NavigatorScreenParams<MainTabParamList>;
};

type CartScreenNavigationProp = NativeStackNavigationProp<
  CartScreenCombinedParamList,
  keyof CartScreenCombinedParamList
>;

const CartScreen: React.FC = () => {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const {
    cart,
    isLoading,
    removeFromCart,
    updateQuantity,
    refreshCart,
    clearCart,
  } = useCart();
  const { token } = useAuth(); // Lấy token từ AuthContext
  const [isPlacingOrder, setIsPlacingOrder] = useState(false); // State cho việc đặt hàng

  useEffect(() => {
    refreshCart(); // Làm mới giỏ hàng khi màn hình được focus hoặc tải lần đầu
  }, []);

  const handleUpdateQuantity = async (
    productId: string,
    newQuantity: number,
  ) => {
    if (newQuantity <= 0) {
      await handleRemoveItem(productId);
    } else {
      try {
        await updateQuantity(productId, newQuantity);
      } catch (error) {
        Alert.alert('Lỗi', 'Không thể cập nhật số lượng sản phẩm.');
        console.error('Lỗi cập nhật số lượng:', error);
      }
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      await removeFromCart(productId);
      Alert.alert('Đã xóa', 'Đã xóa sản phẩm khỏi giỏ hàng.');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể xóa sản phẩm khỏi giỏ hàng.');
      console.error('Lỗi xóa sản phẩm:', error);
    }
  };

  const navigateToProductDetail = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handlePlaceOrder = async () => {
    if (!cart || !cart.id || cart.items.length === 0) {
      Alert.alert(
        'Giỏ hàng trống',
        'Vui lòng thêm sản phẩm vào giỏ hàng trước khi đặt hàng.',
      );
      return;
    }
    if (!token) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập để có thể đặt hàng.',
      );
      // Có thể điều hướng đến màn hình đăng nhập
      // navigation.navigate('LoginScreen');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const orderDetails = {
        cart_id: cart.id,
        shipping_address: {
          street: '123 Đường ABC',
          city: 'Thành phố XYZ',
          country: 'Việt Nam',
          zip_code: '700000',
        },
        payment_method: 'Thanh toán khi nhận hàng (COD)',
      };

      const response = await fetch(`${API_URL}/orders/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderDetails),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Không thể đặt hàng.');
      }

      Alert.alert(
        'Đặt hàng thành công',
        `Đơn hàng của bạn đã được tạo với mã: ${responseData.order.id}. Chúng tôi sẽ sớm liên hệ với bạn.`,
      );
      await refreshCart(); // Làm mới giỏ hàng (server sẽ xóa cart)
      // clearCart(); // Xóa giỏ hàng ở client nếu cần, nhưng refreshCart từ server đã đủ
      navigation.navigate('Main', { screen: 'Profile' }); // Điều hướng đến tab Profile trong MainNavigator
    } catch (error: any) {
      console.error('Lỗi đặt hàng:', error);
      Alert.alert(
        'Lỗi đặt hàng',
        error.message ||
          'Đã có lỗi xảy ra trong quá trình đặt hàng. Vui lòng thử lại.',
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const renderCartItem = ({ item }: { item: ContextCartItem }) => {
    const imageSource = { uri: item.image_path };

    return (
      <View style={styles.cartItemContainer}>
        {/* Cột trái: Ảnh và nút Xóa */}
        <View style={styles.leftSection}>
          <TouchableOpacity
            onPress={() => navigateToProductDetail(item.product_id)}
          >
            <Image
              source={imageSource}
              style={styles.productImage}
              onError={(e) =>
                console.log(
                  'Lỗi tải ảnh giỏ hàng',
                  item.image_path,
                  e.nativeEvent.error,
                )
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveItem(item.product_id)}
          >
            <Ionicons name='trash-outline' size={18} color='#ff3b30' />
            <Text style={styles.removeButtonText}>Xóa</Text>
          </TouchableOpacity>
        </View>

        {/* Cột giữa: Tiêu đề sản phẩm */}
        <View style={styles.middleSection}>
          <TouchableOpacity
            onPress={() => navigateToProductDetail(item.product_id)}
          >
            <Text style={styles.productTitle} numberOfLines={3}>
              {item.title}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cột phải: Giá và Số lượng */}
        <View style={styles.rightSection}>
          <Text style={styles.productPrice}>{item.price} đ</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                handleUpdateQuantity(item.product_id, item.quantity - 1)
              }
            >
              <Ionicons
                name='remove-circle-outline'
                size={28}
                color='#007bff'
              />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() =>
                handleUpdateQuantity(item.product_id, item.quantity + 1)
              }
            >
              <Ionicons name='add-circle-outline' size={28} color='#007bff' />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading && !cart) {
    // Hiển thị loading chỉ khi chưa có dữ liệu cart
    return (
      <View style={[styles.container, styles.centeredMessageContainer]}>
        <ActivityIndicator size='large' color='#007bff' />
        <Text style={{ marginTop: 10 }}>Đang tải giỏ hàng...</Text>
      </View>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <View style={[styles.container, styles.centeredMessageContainer]}>
        <Text style={styles.emptyCartText}>Giỏ hàng của bạn đang trống.</Text>
        <Ionicons
          name='cart-outline'
          size={80}
          color='#cccccc'
          style={{ marginTop: 20 }}
        />
        <TouchableOpacity
          style={styles.shopNowButton}
          onPress={() => navigation.navigate('Main', { screen: 'Home' })} // Điều hướng đến tab Home trong MainNavigator
        >
          <Text style={styles.shopNowButtonText}>MUA SẮM NGAY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cart.items} // Sử dụng cart.items từ context
        renderItem={renderCartItem}
        keyExtractor={(item) => item.product_id}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
        // Thêm onRefresh và refreshing cho pull-to-refresh
        onRefresh={refreshCart}
        refreshing={isLoading}
      />
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Tổng tiền:</Text>
          <Text style={styles.totalAmountText}>
            {/* Sử dụng cart.total từ context, giả sử nó đã được format đúng (string) */}
            {parseFloat(cart.total).toLocaleString('vi-VN')} đ
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.placeOrderButton,
            isPlacingOrder && styles.disabledButton,
          ]}
          onPress={handlePlaceOrder}
          disabled={isLoading || isPlacingOrder}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color='#fff' />
          ) : (
            <Text style={styles.placeOrderButtonText}>ĐẶT HÀNG NGAY</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  centeredMessageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCartText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
  },
  shopNowButton: {
    marginTop: 20,
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  shopNowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContentContainer: {
    paddingBottom: 150,
  },
  cartItemContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    alignItems: 'flex-start', // Căn các cột lên trên cùng
  },
  // Cột trái: Ảnh và nút Xóa
  leftSection: {
    alignItems: 'center',
    marginRight: 10, // Khoảng cách với cột giữa
    width: screenWidth * 0.22, // Chiều rộng cho ảnh và nút xóa
  },
  productImage: {
    width: screenWidth * 0.2,
    height: screenWidth * 0.2,
    resizeMode: 'contain',
    borderRadius: 4,
    marginBottom: 8,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#ffebee',
    borderRadius: 4,
    marginTop: 5, // Khoảng cách từ ảnh
  },
  removeButtonText: {
    marginLeft: 5,
    fontSize: 13,
    color: '#ff3b30',
    fontWeight: '500',
  },
  // Cột giữa: Tiêu đề sản phẩm
  middleSection: {
    flex: 1, // Cho phép tiêu đề chiếm không gian còn lại
    paddingHorizontal: 5, // Khoảng cách nhỏ với các cột khác
    justifyContent: 'center', // Căn giữa tiêu đề theo chiều dọc trong không gian của nó
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20, // Cho phép hiển thị nhiều dòng tốt hơn
  },
  // Cột phải: Giá và Số lượng
  rightSection: {
    alignItems: 'flex-end',
    minWidth: screenWidth * 0.28, // Đảm bảo đủ rộng cho giá 10 chữ số và nút
    paddingLeft: 5, // Khoảng cách nhỏ với cột giữa
  },
  productPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 12, // Khoảng cách với cụm số lượng
    textAlign: 'right',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    padding: 4, // Tăng vùng chạm
  },
  quantityText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 10, // Giảm khoảng cách ngang một chút
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20, // Tăng padding ngang cho footer
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 5, // Shadow cho Android
    shadowColor: '#000', // Shadow cho iOS
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  placeOrderButton: {
    backgroundColor: '#007bff',
    paddingVertical: 14, // Điều chỉnh padding
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50, // Đảm bảo chiều cao tối thiểu cho nút khi có ActivityIndicator
  },
  disabledButton: {
    backgroundColor: '#cccccc', // Màu khi nút bị vô hiệu hóa
  },
  placeOrderButtonText: {
    color: '#fff',
    fontSize: 17, // Điều chỉnh kích thước chữ
    fontWeight: 'bold',
  },
});

export default CartScreen;
