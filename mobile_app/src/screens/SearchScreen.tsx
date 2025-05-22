import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config'; // Giả sử bạn có file config API_URL
import { RootStackParamList } from '../../App'; // Import RootStackParamList

// Interface cho sản phẩm hiển thị (tương tự HomeScreen)
interface DisplayProduct {
  id: string; // MongoDB _id
  original_product_id?: string;
  title: string;
  price: string;
  image_uri?: string;
  description?: string;
  features?: string[];
  inventory?: number;
}

// Interface cho sản phẩm lấy từ API (backend trả về)
interface StructuredProduct {
  _id: string;
  id: string; // original_product_id
  title: string;
  price: string;
  image_path?: string;
  description?: string;
  features?: string[];
  inventory?: number;
  category_id?: string;
  category_name?: string;
}

const { width: screenWidth } = Dimensions.get('window');
const productItemWidth = (screenWidth - 60) / 2; // 20 padding container, 10 padding giữa, 10 mỗi item

const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [allProducts, setAllProducts] = useState<DisplayProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<DisplayProduct[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        // Cố gắng lấy từ /home/structured-content và tổng hợp lại
        const response = await fetch(`${API_URL}/home/structured-content`);
        if (!response.ok) {
          throw new Error(`Lỗi tải dữ liệu: ${response.status}`);
        }
        const structuredData: {
          categories: Array<{ products: StructuredProduct[] }>;
        } = await response.json();

        if (!structuredData.categories) {
          throw new Error('Định dạng dữ liệu không đúng từ API.');
        }

        let collectedProducts: StructuredProduct[] = [];
        structuredData.categories.forEach((category) => {
          collectedProducts = [...collectedProducts, ...category.products];
        });

        // Loại bỏ trùng lặp dựa trên _id nếu có
        const uniqueProducts = collectedProducts.filter(
          (product, index, self) =>
            index === self.findIndex((p) => p._id === product._id),
        );

        const processedProducts: DisplayProduct[] = uniqueProducts.map(
          (sProd: StructuredProduct) => ({
            id: sProd._id,
            original_product_id: sProd.id,
            title: sProd.title,
            price: sProd.price,
            image_uri: sProd.image_path, // Giả sử image_path là URL đầy đủ hoặc có thể xử lý được
            description: sProd.description,
            features: sProd.features,
            inventory: sProd.inventory,
          }),
        );

        setAllProducts(processedProducts);
        setFilteredProducts(processedProducts); // Ban đầu hiển thị tất cả
      } catch (err) {
        console.error('Lỗi khi tải tất cả sản phẩm:', err);
        setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.');
      } finally {
        setLoading(false);
      }
    };

    fetchAllProducts();
  }, []);

  useEffect(() => {
    if (searchQuery === '') {
      setFilteredProducts(allProducts);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = allProducts.filter((product) =>
        product.title.toLowerCase().includes(lowercasedQuery),
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, allProducts]);

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const renderProductItem = ({ item }: { item: DisplayProduct }) => (
    <TouchableOpacity
      style={styles.productItemContainer}
      onPress={() => handleProductPress(item.id)}
    >
      <Image
        source={{ uri: item.image_uri || 'https://via.placeholder.com/150' }} // Fallback image
        style={styles.productImage}
        onError={(e) =>
          console.log(`Lỗi tải ảnh: ${item.image_uri}`, e.nativeEvent.error)
        }
      />
      <Text style={styles.productTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.productPrice}>{item.price} đ</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centeredMessageContainer}>
        <ActivityIndicator size='large' color='#007bff' />
        <Text>Đang tải sản phẩm...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredMessageContainer}>
        <Text style={styles.errorText}>Lỗi: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder='Search...'
          placeholderTextColor='#888'
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode='while-editing'
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => {
            /* Xử lý tìm kiếm nếu cần */
          }}
        >
          <Ionicons name='search' size={24} color='#fff' />
        </TouchableOpacity>
      </View>
      {filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.centeredMessageContainer}>
          <Text>Không tìm thấy sản phẩm nào.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20, // Tăng padding top để có không gian cho search bar mới
    backgroundColor: '#fff',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0', // Màu nền của thanh tìm kiếm như trong ảnh (trắng/sáng)
    borderRadius: 25, // Bo tròn mạnh
    paddingHorizontal: 10, // Padding bên trong container
    paddingVertical: 5, // Padding dọc bên trong container
    marginBottom: 20,
    height: 50, // Chiều cao cố định cho search bar
    elevation: 2, // Shadow nhẹ cho Android
    shadowColor: '#000', // Shadow cho iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1, // TextInput chiếm phần lớn không gian
    height: '100%',
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#333', // Màu chữ khi nhập
    backgroundColor: 'transparent', // Nền trong suốt vì đã có ở container
  },
  searchButton: {
    backgroundColor: '#007bff', // Màu xanh dương
    borderRadius: 20, // Bo tròn để thành hình tròn (phải = height/2)
    width: 40, // Chiều rộng nút
    height: 40, // Chiều cao nút
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8, // Khoảng cách với TextInput
  },
  productList: {
    paddingBottom: 20, // Để item cuối không bị che
  },
  productItemContainer: {
    width: productItemWidth,
    marginBottom: 20,
    marginHorizontal: 5, // Khoảng cách giữa các item trong hàng
    backgroundColor: '#fff', // Nền cho item
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    padding: 10,
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'contain',
    marginBottom: 10,
    borderRadius: 4,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 34, // Đảm bảo 2 dòng
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
});

export default SearchScreen;
