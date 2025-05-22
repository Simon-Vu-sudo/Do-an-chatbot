export const ProductData = {
  categories: [
    {
      category_id: 'cat001',
      name: 'Điện thoại thông minh',
      description:
        'Điện thoại thông minh mới nhất với nhiều tính năng tiên tiến',
      image_path: 'images/categories/smartphones.jpg',
      products: [
        {
          id: 'prod001',
          title: 'iPhone 15 Pro',
          description:
            'Điện thoại cao cấp của Apple với chip A17 Pro, hệ thống camera 48MP, và thiết kế titan.',
          price: '27.990.000',
          features: [
            'Chip A17 Pro',
            'Camera 48MP',
            'Thiết kế titan',
            'Pin dùng cả ngày',
          ],
          image_path: 'images/products/smartphones/iphone15pro.jpg',
          inventory: 15,
          category_id: 'cat001',
          category_name: 'Điện thoại thông minh',
        },
        {
          id: 'prod002',
          title: 'Samsung Galaxy S23 Ultra',
          description:
            'Flagship của Samsung với camera 200MP, bút S Pen tích hợp, và hiệu năng mạnh mẽ.',
          price: '23.990.000',
          features: [
            'Camera 200MP',
            'S Pen tích hợp',
            'Snapdragon 8 Gen 2',
            'Pin 5000mAh',
          ],
          image_path: 'images/products/smartphones/s23ultra.jpg',
          inventory: 20,
          category_id: 'cat001',
          category_name: 'Điện thoại thông minh',
        },
        {
          id: 'prod003',
          title: 'Xiaomi 13T Pro',
          description:
            'Smartphone cao cấp với camera Leica, sạc siêu nhanh 120W và màn hình AMOLED 144Hz.',
          price: '16.990.000',
          features: [
            'Camera Leica',
            'Sạc 120W',
            'Màn hình 144Hz',
            'Dimensity 9200+',
          ],
          image_path: 'images/products/smartphones/xiaomi13tpro.jpg',
          inventory: 25,
          category_id: 'cat001',
          category_name: 'Điện thoại thông minh',
        },
      ],
    },
    {
      category_id: 'cat002',
      name: 'Laptop',
      description: 'Laptop mạnh mẽ cho công việc và giải trí',
      image_path: 'images/categories/laptops.jpg',
      products: [
        {
          id: 'prod004',
          title: 'MacBook Pro 14 M3 Pro',
          description:
            'Laptop chuyên nghiệp của Apple với chip M3 Pro, màn hình Liquid Retina XDR và thời lượng pin đến 18 giờ.',
          price: '49.990.000',
          features: [
            'Chip M3 Pro',
            'Màn hình Liquid Retina XDR',
            'Pin 18 giờ',
            '16GB RAM',
          ],
          image_path: 'images/products/laptops/macbookprom3.jpg',
          inventory: 10,
          category_id: 'cat002',
          category_name: 'Laptop',
        },
        {
          id: 'prod005',
          title: 'Dell XPS 15',
          description:
            'Laptop cao cấp với màn hình OLED 4K, chip Intel Core i9 và card đồ họa NVIDIA RTX 4070.',
          price: '42.990.000',
          features: [
            'Màn hình OLED 4K',
            'Intel Core i9',
            'NVIDIA RTX 4070',
            '32GB RAM',
          ],
          image_path: 'images/products/laptops/dellxps15.jpg',
          inventory: 8,
          category_id: 'cat002',
          category_name: 'Laptop',
        },
        {
          id: 'prod006',
          title: 'ASUS ROG Zephyrus G14',
          description:
            'Laptop gaming mỏng nhẹ với AMD Ryzen 9, NVIDIA RTX 4060 và màn hình 2K 165Hz.',
          price: '35.990.000',
          features: [
            'AMD Ryzen 9',
            'NVIDIA RTX 4060',
            'Màn hình 2K 165Hz',
            '1TB SSD',
          ],
          image_path: 'images/products/laptops/asusrogzephyrus.jpg',
          inventory: 12,
          category_id: 'cat002',
          category_name: 'Laptop',
        },
      ],
    },
    {
      category_id: 'cat003',
      name: 'Tai nghe',
      description: 'Tai nghe chất lượng cao cho trải nghiệm âm thanh tuyệt vời',
      image_path: 'images/categories/headphones.jpg',
      products: [
        {
          id: 'prod007',
          title: 'Apple AirPods Pro 2',
          description:
            'Tai nghe không dây với chống ồn chủ động, âm thanh không gian và chip H2.',
          price: '6.790.000',
          features: [
            'Chống ồn chủ động',
            'Âm thanh không gian',
            'Chip H2',
            'Chống nước IPX4',
          ],
          image_path: 'images/products/headphones/airpodspro2.jpg',
          inventory: 30,
          category_id: 'cat003',
          category_name: 'Tai nghe',
        },
        {
          id: 'prod008',
          title: 'Sony WH-1000XM5',
          description:
            'Tai nghe chụp tai với chống ồn hàng đầu, âm thanh Hi-Res và thời lượng pin 30 giờ.',
          price: '8.490.000',
          features: [
            'Chống ồn hàng đầu',
            'Âm thanh Hi-Res',
            'Pin 30 giờ',
            '8 microphone',
          ],
          image_path: 'images/products/headphones/sonywh1000xm5.jpg',
          inventory: 18,
          category_id: 'cat003',
          category_name: 'Tai nghe',
        },
        {
          id: 'prod009',
          title: 'Samsung Galaxy Buds 2 Pro',
          description:
            'Tai nghe true wireless với âm thanh Hi-Fi 24bit, chống ồn chủ động và thiết kế nhỏ gọn.',
          price: '4.990.000',
          features: [
            'Âm thanh Hi-Fi 24bit',
            'Chống ồn chủ động',
            'Thiết kế nhỏ gọn',
            'Chống nước IPX7',
          ],
          image_path: 'images/products/headphones/galaxybuds2pro.jpg',
          inventory: 0,
          category_id: 'cat003',
          category_name: 'Tai nghe',
        },
      ],
    },
  ],
};
