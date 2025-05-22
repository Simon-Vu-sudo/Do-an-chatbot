import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useNavigation,
  useFocusEffect,
  CompositeNavigationProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import EditProfileModal from '../component/EditProfileModal';
import { RootStackParamList, MainTabParamList } from '../../App';
import { API_URL } from '../config';

// Định nghĩa kiểu cho item trong đơn hàng (tương tự CartItem nhưng có thể có thêm trường status cho từng item nếu cần)
interface OrderItemDisplay {
  product_id: string;
  title: string;
  price: string; // Giá tại thời điểm đặt hàng
  quantity: number;
  image_path?: string;
}

// Định nghĩa kiểu cho một đơn hàng
interface OrderDisplay {
  id: string; // _id từ MongoDB
  items: OrderItemDisplay[];
  total_amount: string;
  status: string; // 'Đang vận chuyển', 'Đã giao', 'Đã hủy', 'Đang xử lý' v.v.
  created_at: string;
  shipping_address: AddressDataToEdit; // Cập nhật kiểu ở đây
  // Thêm các trường khác nếu cần hiển thị: payment_method
}

// Định nghĩa kiểu cho dữ liệu profile và address để truyền cho modal
type UserProfileDataToEdit = {
  full_name: string;
};

// Cập nhật AddressDataToEdit để khớp với cấu trúc mới từ EditProfileModal
type AddressDataToEdit = {
  street: string;
  province_id: string | null;
  province_name: string | null;
  district_id: string | null;
  district_name: string | null;
  ward_id: string | null;
  ward_name: string | null;
};

// Định nghĩa lại ProfileScreenNavigationProp
type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, token, logout, setUser } = useAuth();
  const [orders, setOrders] = useState<OrderDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // State cho địa chỉ hiện tại để truyền vào modal
  // currentShippingAddressForEdit sẽ có kiểu AddressDataToEdit mới
  const [currentShippingAddressForEdit, setCurrentShippingAddressForEdit] =
    useState<AddressDataToEdit | null>(null);

  const fetchOrdersAndSetAddress = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/orders/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Không thể tải danh sách đơn hàng.');
      }
      setOrders(data.orders as OrderDisplay[]);
      if (data.orders.length > 0 && data.orders[0].shipping_address) {
        // Giả sử shipping_address từ API trả về đã có cấu trúc mới
        // Nếu API trả về cấu trúc cũ (city, country, zip_code), cần có bước chuyển đổi
        // hoặc EditProfileModal sẽ không thể khởi tạo picker chính xác.
        // Hiện tại, EditProfileModal sẽ chỉ lấy `street` từ currentAddress nếu cấu trúc cũ.
        const firstOrderAddress = data.orders[0].shipping_address;
        if (
          typeof firstOrderAddress === 'object' &&
          firstOrderAddress !== null
        ) {
          // Nếu API trả về cấu trúc mới, gán trực tiếp
          if ('province_id' in firstOrderAddress) {
            setCurrentShippingAddressForEdit(
              firstOrderAddress as AddressDataToEdit,
            );
          } else {
            // Nếu API trả về cấu trúc cũ (ví dụ: city, country)
            // Chúng ta chỉ có thể map street, còn lại user phải tự chọn trong modal
            setCurrentShippingAddressForEdit({
              street: firstOrderAddress.street || '',
              // Các trường tỉnh/huyện/xã sẽ là null, modal sẽ xử lý
              province_id: null,
              province_name: null,
              district_id: null,
              district_name: null,
              ward_id: null,
              ward_name: null,
              // Có thể thử gán tên nếu API trả về tên, nhưng modal không dùng trực tiếp
              // city: firstOrderAddress.city,
              // country: firstOrderAddress.country
            });
          }
        } else {
          // Xử lý trường hợp shipping_address không phải object hoặc null
          setCurrentShippingAddressForEdit(null);
        }
      } else {
        // Nếu không có đơn hàng hoặc không có địa chỉ, đặt là null hoặc một địa chỉ mặc định trống
        setCurrentShippingAddressForEdit(null);
      }
    } catch (error: any) {
      console.error('Lỗi tải dữ liệu profile:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchOrdersAndSetAddress();
    }, [fetchOrdersAndSetAddress]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOrdersAndSetAddress();
  };

  const navigateToProductDetail = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleLogout = async () => {
    await logout();
    // Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
    //   { text: 'Hủy', style: 'cancel' },
    //   {
    //     text: 'Đăng xuất',
    //     onPress: async () => {
    //     },
    //     style: 'destructive',
    //   },
    // ]);
  };

  const handleOpenEditModal = () => {
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async (
    profileData: UserProfileDataToEdit,
    addressData: AddressDataToEdit, // addressData giờ có cấu trúc mới
  ) => {
    try {
      if (user) {
        const updatedUser = { ...user, full_name: profileData.full_name };
        setUser(updatedUser);
      }
      // Giả sử user object trên context/state cũng nên được cập nhật với địa chỉ mới nếu cần
      // Ví dụ: setUser({ ...user, full_name: profileData.full_name, address: addressData });
      // Tuy nhiên, user object trong AuthContext không có trường address riêng, nên chỉ cập nhật local state
      setCurrentShippingAddressForEdit(addressData);
      Alert.alert('Thành công', 'Thông tin của bạn đã được cập nhật.');
      setIsEditModalVisible(false);
    } catch (error: any) {
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể cập nhật thông tin. Vui lòng thử lại.',
      );
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Đang vận chuyển':
        return styles.statusShipping;
      case 'Đã giao':
        return styles.statusDelivered;
      case 'Đã hủy':
        return styles.statusCancelled;
      case 'Đang xử lý':
        return styles.statusProcessing;
      default:
        return styles.statusDefault;
    }
  };

  const renderOrderItem = ({ item: product }: { item: OrderItemDisplay }) => (
    <TouchableOpacity
      style={styles.orderItemContainer}
      onPress={() => navigateToProductDetail(product.product_id)}
    >
      <Image
        source={{
          uri: product.image_path || 'https://via.placeholder.com/100',
        }}
        style={styles.productImage}
        onError={(e) =>
          console.log(
            'Lỗi tải ảnh sản phẩm trong đơn hàng',
            product.image_path,
            e.nativeEvent.error,
          )
        }
      />
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>
          {product.title}
        </Text>
      </View>
      <View style={styles.priceContainer}>
        <Text style={styles.productPrice}>
          {parseFloat(product.price).toLocaleString('vi-VN')} đ
        </Text>
        <Text style={styles.productQuantity}>x{product.quantity}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderOrder = ({ item: order }: { item: OrderDisplay }) => (
    <View style={styles.orderContainer}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderIdText}>Mã ĐH: {order.id}</Text>
        <View style={[styles.statusBadge, getStatusStyle(order.status)]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </View>
      <FlatList
        data={order.items}
        renderItem={renderOrderItem}
        keyExtractor={(product) =>
          product.product_id + Math.random().toString()
        } // Đảm bảo key duy nhất nếu product_id có thể trùng trong các item khác nhau của cùng order (ít xảy ra)
        scrollEnabled={false} // Vô hiệu hóa scroll cho FlatList con
      />
      <View style={styles.orderFooter}>
        <Text style={styles.totalAmountText}>
          Tổng tiền: {parseFloat(order.total_amount).toLocaleString('vi-VN')} đ
        </Text>
        <Text style={styles.orderDateText}>
          Ngày đặt: {new Date(order.created_at).toLocaleDateString('vi-VN')}
        </Text>
      </View>
    </View>
  );

  const renderProfileHeader = () => {
    const displayAddress = currentShippingAddressForEdit;

    return (
      <View style={styles.profileHeaderContainer}>
        <View style={styles.profileActionsContainer}>
          <TouchableOpacity onPress={handleLogout} style={styles.iconButton}>
            <Ionicons name='log-out-outline' size={28} color='#dc3545' />
            <Text style={styles.iconButtonText}>Đăng xuất</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenEditModal}
            style={styles.iconButton}
          >
            <Ionicons name='person-circle-outline' size={28} color='#007bff' />
            <Text style={styles.iconButtonText}>Sửa TT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.userInfoContainer}>
          <Ionicons
            name='person-circle'
            size={80}
            color='#007bff'
            style={styles.avatar}
          />
          <Text style={styles.userName}>{user?.full_name || user?.email}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {displayAddress && (
          <View style={styles.addressContainer}>
            <Text style={styles.addressTitle}>Địa chỉ giao hàng:</Text>
            <Text style={styles.addressText}>{displayAddress.street}</Text>
            {/* Hiển thị tên tỉnh, huyện, xã nếu có */}
            {displayAddress.ward_name && (
              <Text style={styles.addressText}>
                {`${displayAddress.ward_name}, ${displayAddress.district_name}, ${displayAddress.province_name}`}
              </Text>
            )}
            {/* Fallback nếu chỉ có thông tin cũ (city, country) - điều này không nên xảy ra nếu dùng cấu trúc mới */}
            {/* {!displayAddress.province_name && displayAddress.city && (
              <Text style={styles.addressText}>
                {`${displayAddress.city}, ${displayAddress.country}`}
              </Text>
            )} */}
          </View>
        )}
        <Text style={styles.orderHistoryTitle}>Lịch sử đơn hàng</Text>
      </View>
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={[styles.container, styles.centeredMessageContainer]}>
        <ActivityIndicator size='large' color='#007bff' />
        <Text style={{ marginTop: 10 }}>Đang tải thông tin...</Text>
      </View>
    );
  }

  if (!user || !token) {
    return (
      <View style={[styles.container, styles.centeredMessageContainer]}>
        <Ionicons name='log-in-outline' size={80} color='#cccccc' />
        <Text style={styles.emptyText}>
          Vui lòng đăng nhập để xem thông tin cá nhân và đơn hàng.
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.loginButtonText}>ĐĂNG NHẬP</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#007bff']}
          />
        }
      >
        {renderProfileHeader()}
        {orders.length === 0 ? (
          <View
            style={[
              styles.centeredMessageContainerNoFlex,
              { paddingVertical: 40 },
            ]}
          >
            <Ionicons name='receipt-outline' size={60} color='#cccccc' />
            <Text style={styles.emptyTextSmall}>Bạn chưa có đơn hàng nào.</Text>
            <TouchableOpacity
              style={styles.shopNowButtonSmall}
              onPress={() => navigation.navigate('Main', { screen: 'Home' })}
            >
              <Text style={styles.shopNowButtonTextSmall}>MUA SẮM NGAY</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={orders}
            renderItem={renderOrder}
            keyExtractor={(order) => order.id}
            contentContainerStyle={styles.listContentContainer}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false} // Để ScrollView cha xử lý cuộn
          />
        )}
      </ScrollView>
      <EditProfileModal
        isVisible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleSaveProfile}
        currentUser={user}
        currentAddress={
          currentShippingAddressForEdit
            ? {
                street: currentShippingAddressForEdit.street,
                // Truyền các trường cũ nếu có, EditProfileModal sẽ chỉ dùng street
                // Hoặc tốt hơn là ProfileScreen quản lý một state riêng cho `OldAddressData` nếu cần
                // Để đơn giản, truyền một object có street, còn lại để modal xử lý
                city: currentShippingAddressForEdit.province_name || '', // Tạm thời, modal sẽ không dùng cái này để fill picker
                country: '', // Tương tự
                zip_code: '', // Tương tự
              }
            : null
        }
      />
    </>
  );
};

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  profileHeaderContainer: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconButton: {
    alignItems: 'center',
  },
  iconButtonText: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  userInfoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    marginBottom: 10,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  addressContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  addressText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  orderHistoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
    textAlign: 'center',
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredMessageContainerNoFlex: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginTop: 15,
  },
  emptyTextSmall: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 10,
  },
  shopNowButton: {
    marginTop: 25,
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  shopNowButtonSmall: {
    marginTop: 15,
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  shopNowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shopNowButtonTextSmall: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContentContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  orderContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusProcessing: { backgroundColor: '#ffc107' },
  statusShipping: { backgroundColor: '#17a2b8' },
  statusDelivered: { backgroundColor: '#28a745' },
  statusCancelled: { backgroundColor: '#dc3545' },
  statusDefault: { backgroundColor: '#6c757d' },

  orderItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  productImage: {
    width: screenWidth * 0.18,
    height: screenWidth * 0.18,
    resizeMode: 'contain',
    borderRadius: 4,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    lineHeight: 20,
  },
  priceContainer: {
    minWidth: screenWidth * 0.28,
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 13,
    color: '#777',
  },
  orderFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDateText: {
    fontSize: 13,
    color: '#666',
  },
  loginButton: {
    marginTop: 20,
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
