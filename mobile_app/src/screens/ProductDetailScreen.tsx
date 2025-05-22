import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../config'; // Import API_URL
import { ProductData } from '../../constants/mock'; // Keep for related products for now
import { RootStackParamList } from '../../App'; // Sử dụng RootStackParamList
import { useCart } from '../context/CartContext'; // Thêm useCart

// Define the structure for the product fetched from the API
interface FetchedProduct {
  id: string; // MongoDB _id as string
  original_product_id?: string;
  title: string;
  description?: string;
  price: string;
  features?: string[];
  image_path?: string; // Assumed to be a full URL
  stock_count?: number;
  category_id: string;
  category_name?: string;
  // Add other fields like created_at, updated_at if present and needed
}

type ProductDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'ProductDetail'
>;

// Keep findRelatedProducts using mock data for now
// This function should eventually use API data or be removed if not needed
const findRelatedProducts = (
  // @ts-ignore
  currentProduct: FetchedProduct | null, // currentProduct will be FetchedProduct
  // @ts-ignore
  allMockProducts: any[], // Pass mock product data here
): any[] => {
  // Return type based on mock data structure
  if (!currentProduct || !currentProduct.category_id) return [];

  const category = ProductData.categories.find(
    (cat) => cat.category_id === currentProduct.category_id, // Assuming mock category_id matches
  );
  if (!category) return [];

  // @ts-ignore
  return category.products.filter(
    (p) =>
      p.id !== currentProduct.original_product_id && p.id !== currentProduct.id,
  ); // Adjust based on ID used in mock
};

const { width: screenWidth } = Dimensions.get('window');
const relatedProductItemWidth = screenWidth * 0.35;

const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailScreenRouteProp>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>(); // Sử dụng RootStackParamList
  const { productId } = route.params;
  const cartContext = useCart(); // Sử dụng useCart
  const { cart } = cartContext; // Lấy cart từ context

  const [product, setProduct] = useState<FetchedProduct | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isInCart, setIsInCart] = useState<boolean>(false); // State mới
  const [justAdded, setJustAdded] = useState<boolean>(false); // State mới

  // Related products state - still using mock data for now
  // @ts-ignore
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!productId) {
        setError('Product ID is missing.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        console.log(
          `Fetching product details for ID: ${productId} from ${API_URL}/products/${productId}`,
        );
        const response = await fetch(`${API_URL}/products/${productId}`);
        if (!response.ok) {
          const errorData = await response.text();
          console.error('API Error Response:', errorData);
          throw new Error(
            `Error fetching product: ${response.status} - ${errorData}`,
          );
        }
        const data: FetchedProduct = await response.json();
        setProduct(data);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [productId]);

  useEffect(() => {
    // Cập nhật isInCart khi sản phẩm hoặc giỏ hàng thay đổi
    if (product && cart?.items) {
      const found = cart.items.some((item) => item.product_id === product.id);
      setIsInCart(found);
    } else {
      setIsInCart(false);
    }
  }, [product, cart, productId]); // Thêm productId để đảm bảo reset đúng khi product thay đổi

  useEffect(() => {
    // Reset trạng thái justAdded khi productId thay đổi (khi người dùng xem sản phẩm khác)
    setJustAdded(false);
  }, [productId]);

  const handleAddToCart = async () => {
    if (product && !isInCart && !justAdded) {
      // Chỉ thêm nếu chưa có và không phải vừa mới thêm
      try {
        console.log('Thêm vào giỏ hàng:', product.title, product.id);
        await cartContext.addToCart(product.id, 1);
        Alert.alert('Thành công', `Đã thêm "${product.title}" vào giỏ hàng!`);
        setJustAdded(true);
        setIsInCart(true); // Sản phẩm giờ đã ở trong giỏ
        setTimeout(() => {
          setJustAdded(false); // Reset trạng thái "vừa thêm" sau 3 giây
        }, 3000);
      } catch (error) {
        console.error('Lỗi khi thêm vào giỏ hàng:', error);
        Alert.alert('Lỗi', 'Không thể thêm sản phẩm vào giỏ hàng.');
      }
    }
  };

  const handleRelatedProductPress = (relatedProductId: string) => {
    navigation.push('ProductDetail', { productId: relatedProductId });
  };

  const renderRelatedProductItem = ({
    item: relatedProd,
  }: // @ts-ignore // item is from mock data
  {
    item: any;
  }) => {
    // Assuming relatedProd.image_path from mock data might be relative or full
    const relatedImageSourceUri =
      relatedProd.image_path && relatedProd.image_path.startsWith('http')
        ? relatedProd.image_path
        : // @ts-ignore
        relatedProd.image_path
        ? `../../../../${relatedProd.image_path}`
        : undefined; // Adjust for mock data path

    return (
      <TouchableOpacity
        style={[styles.relatedProductItem, { width: relatedProductItemWidth }]}
        onPress={() => handleRelatedProductPress(relatedProd.id)} // Ensure relatedProd.id is the MongoDB _id if navigating to API-driven detail
      >
        {relatedImageSourceUri ? (
          <Image
            source={{ uri: relatedImageSourceUri }}
            style={styles.relatedProductImage}
            onError={(e) =>
              console.log(
                'Error loading related product image',
                e.nativeEvent.error,
              )
            }
          />
        ) : (
          <View style={styles.relatedPlaceholderImage}>
            <Text>No Image</Text>
          </View>
        )}
        <Text style={styles.relatedProductTitle} numberOfLines={2}>
          {relatedProd.title}
        </Text>
        <Text style={styles.relatedProductPrice}>{relatedProd.price} đ</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centeredMessageContainer}>
        <Text>Loading product details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredMessageContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.centeredMessageContainer}>
        <Text style={styles.errorText}>Sản phẩm không tồn tại!</Text>
      </View>
    );
  }

  // Assuming product.image_path from API is a full URL
  const imageSourceUri = product.image_path;

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        {imageSourceUri ? (
          <Image
            source={{ uri: imageSourceUri }}
            style={styles.productImage}
            onError={(e) =>
              console.log(
                'Lỗi tải ảnh chi tiết:',
                imageSourceUri,
                e.nativeEvent.error,
              )
            }
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text>No Image Available</Text>
          </View>
        )}
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>{product.price} đ</Text>

        {/* Nút thêm vào giỏ hàng */}
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            (isInCart || justAdded) && styles.addToCartButtonDisabled,
          ]}
          onPress={handleAddToCart}
          disabled={isInCart || justAdded} // Vô hiệu hóa nút
        >
          <Ionicons name='cart-outline' size={24} color='#fff' />
          <Text style={styles.addToCartButtonText}>
            {justAdded
              ? 'Đã thêm!'
              : isInCart
              ? 'Đã có trong giỏ'
              : 'Thêm vào giỏ hàng'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.descriptionTitle}>Mô tả sản phẩm:</Text>
        <Text style={styles.description}>
          {product.description || 'Không có mô tả.'}
        </Text>

        {product.features && product.features.length > 0 && (
          <View style={styles.featuresContainer}>
            <Text style={styles.descriptionTitle}>Tính năng nổi bật:</Text>
            {product.features.map(
              (feature: string, index: React.Key | null | undefined) => (
                <Text key={index} style={styles.featureItem}>
                  - {feature}
                </Text>
              ),
            )}
          </View>
        )}

        {/* Carousel sản phẩm liên quan (still uses mock data) */}
        {relatedProducts.length > 0 && (
          <View style={styles.relatedProductsSection}>
            <Text style={styles.relatedProductsTitle}>
              Sản phẩm cùng danh mục
            </Text>
            <FlatList
              data={relatedProducts}
              keyExtractor={(item) => item.id}
              renderItem={renderRelatedProductItem}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedProductListContainer}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centeredMessageContainer: {
    // Added style for loading/error messages
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  productImage: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'contain',
    marginBottom: 20,
    borderRadius: 8,
  },
  placeholderImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  price: {
    fontSize: 20,
    color: '#e74c3c',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  addToCartButton: {
    flexDirection: 'row',
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 2,
  },
  addToCartButtonDisabled: {
    // Style cho nút khi bị vô hiệu hóa/mờ
    backgroundColor: '#a0c8e0', // Màu nhạt hơn
    opacity: 0.7,
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  description: {
    fontSize: 16,
    textAlign: 'left',
    marginBottom: 15,
    alignSelf: 'flex-start',
    lineHeight: 22,
  },
  featuresContainer: {
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  featureItem: {
    fontSize: 16,
    marginLeft: 10, // Thụt lề cho đẹp
    lineHeight: 22,
  },
  info: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
  },
  // Styles cho sản phẩm liên quan
  relatedProductsSection: {
    marginTop: 30,
    width: '100%',
  },
  relatedProductsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    // textAlign: 'center', // Hoặc left tùy bạn
  },
  relatedProductListContainer: {
    paddingVertical: 10, // Thêm padding để không quá sát
  },
  relatedProductItem: {
    marginRight: 10, // Khoảng cách giữa các item
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    alignItems: 'center',
    // width được set inline
  },
  relatedProductImage: {
    width: '100%',
    aspectRatio: 1, // Giữ ảnh vuông
    resizeMode: 'contain',
    marginBottom: 8,
    borderRadius: 4,
  },
  relatedPlaceholderImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 4,
  },
  relatedProductTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 30, // Cho 2 dòng title
  },
  relatedProductPrice: {
    fontSize: 12,
    color: '#888',
  },
});

export default ProductDetailScreen;
