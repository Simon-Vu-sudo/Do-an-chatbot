import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { API_URL } from '../config';

interface StructuredProduct {
  _id: string; // MongoDB ID
  id: string; // original_product_id từ backend, vd: "prod001"
  title: string;
  price: string;
  image_path?: string; // vd: "images/products/smartphones/iphone15pro.jpg"
  description?: string;
  features?: string[];
  inventory?: number; // Backend trả về 'inventory'
  category_id?: string; // original_id của category cha
  category_name?: string;
}

interface StructuredCategory {
  category_id: string; // original_id của category, vd: "cat001"
  name: string;
  description?: string;
  image_path?: string; // vd: "images/categories/smartphones.jpg"
  products: StructuredProduct[];
}

// --- Interface Definitions for Display Data (có thể không thay đổi nhiều) ---
interface DisplayProduct {
  id: string; // This will now be the MongoDB _id
  original_product_id?: string; // original_product_id from Lazada/source
  title: string;
  price: string;
  image_uri?: string; // Fully qualified URI for the image
  // Giữ các trường khác nếu ProductDetailScreen cần
  description?: string;
  features?: string[];
  inventory?: number;
}

interface DisplayCategory {
  id: string; // Sử dụng category_id từ structured data
  name: string;
  description?: string;
  image_uri?: string; // URI đầy đủ cho ảnh category (nếu có)
  products: DisplayProduct[];
}

// --- Navigation Param List (không đổi) ---
type RootStackParamListNavigation = {
  Home: undefined;
  ProductDetail: { productId: string }; // productId ở đây sẽ là MongoDB _id
  Login: undefined;
};

const { width: screenWidth } = Dimensions.get('window');
const productItemWidth = screenWidth * 0.6;

// --- RenderProductItem Component (không đổi nhiều, chỉ đảm bảo props khớp) ---
const RenderProductItem = ({ item }: { item: DisplayProduct }) => {
  const navigation =
    useNavigation<NavigationProp<RootStackParamListNavigation>>();

  const handleProductPress = () => {
    navigation.navigate('ProductDetail', { productId: item.id });
  };
  return (
    <TouchableOpacity
      onPress={handleProductPress}
      style={[styles.productItem, { width: productItemWidth }]}
    >
      <Image
        source={{ uri: item.image_uri }}
        style={styles.productImage}
        onError={(e) =>
          console.log(`Lỗi tải ảnh: ${item.image_uri}`, e.nativeEvent.error)
        }
      />
      <Text style={styles.productTitle} numberOfLines={2} ellipsizeMode='tail'>
        {item.title}
      </Text>
      <Text style={styles.productPrice}>{item.price} đ</Text>
    </TouchableOpacity>
  );
};

// --- RenderCategorySection Component (không đổi) ---
const RenderCategorySection = ({
  item: category,
}: {
  item: DisplayCategory;
}) => (
  <View style={styles.categorySection}>
    <Text style={styles.categoryTitle}>{category.name}</Text>
    {category.products.length > 0 ? (
      <FlatList
        data={category.products}
        keyExtractor={(product) => product.id}
        renderItem={({ item }) => <RenderProductItem item={item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productListContainer}
      />
    ) : (
      <Text style={styles.noProductsText}>
        Không có sản phẩm trong danh mục này.
      </Text>
    )}
  </View>
);

// --- HomeScreen Component (Cập nhật fetchData) ---
const HomeScreen: React.FC = () => {
  const [displayCategories, setDisplayCategories] = useState<DisplayCategory[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch dữ liệu đã được cấu trúc từ backend
        const response = await fetch(`${API_URL}/home/structured-content`);
        if (!response.ok) {
          throw new Error(`Lỗi tải dữ liệu: ${response.status}`);
        }
        // API trả về object có key "categories", chứa mảng các StructuredCategory
        const structuredData: { categories: StructuredCategory[] } =
          await response.json();

        if (!structuredData.categories) {
          throw new Error('Định dạng dữ liệu không đúng từ API.');
        }

        // 2. Chuyển đổi StructuredCategory[] thành DisplayCategory[]
        const processedCategories: DisplayCategory[] =
          structuredData.categories.map((sCat: StructuredCategory) => ({
            id: sCat.category_id, // Sử dụng category_id từ API làm id cho DisplayCategory
            name: sCat.name,
            description: sCat.description,
            image_uri: sCat.image_path, // URI ảnh category
            products: sCat.products.map((sProd: StructuredProduct) => ({
              id: sProd._id, // Sử dụng MongoDB _id cho DisplayProduct.id
              original_product_id: sProd.id, // Lưu original_product_id (nếu cần)
              title: sProd.title,
              price: sProd.price,
              image_uri: sProd.image_path, // URI ảnh sản phẩm
              description: sProd.description,
              features: sProd.features,
              inventory: sProd.inventory,
            })),
          }));

        setDisplayCategories(processedCategories);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
        setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Phần render UI (không thay đổi nhiều, chỉ kiểm tra điều kiện hiển thị) ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size='large' color='#0000ff' />
        <Text>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Lỗi: {error}</Text>
        <Text>Vui lòng thử lại sau.</Text>
      </View>
    );
  }

  // Sửa lại điều kiện hiển thị FlatList và thông báo "Không có dữ liệu"
  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Trang Chủ</Text> {/* Thêm Header Text */}
      {displayCategories.length > 0 ? (
        <FlatList
          data={displayCategories}
          keyExtractor={(category) => category.id}
          renderItem={({ item }) => <RenderCategorySection item={item} />}
        />
      ) : (
        // Giữ lại View centered này để thông báo được căn giữa đẹp hơn
        <View style={styles.centered}>
          <Text>Không có dữ liệu để hiển thị.</Text>
        </View>
      )}
    </View>
  );
};

// --- Styles (Thêm style cho header) ---
const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    // Style cho View chứa header (nếu bạn muốn bọc Text trong View)
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f8f8f8',
  },
  headerText: {
    // Style cho chữ "Trang Chủ"
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10, // Khoảng cách với FlatList bên dưới
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  productListContainer: {
    paddingHorizontal: 10,
  },
  productItem: {
    marginHorizontal: 5,
    padding: 10,
    marginVertical: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'contain',
    marginBottom: 8,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 35,
  },
  productPrice: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '600',
  },
  noProductsText: {
    textAlign: 'center',
    paddingVertical: 20,
    color: '#888',
    paddingHorizontal: 15,
  },
});

export default HomeScreen;

// Nhớ tạo file placeholder.png trong mobile_app/assets/
// Ví dụ: mobile_app/assets/placeholder.png
