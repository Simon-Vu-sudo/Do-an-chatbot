import json
from datetime import datetime
import uuid

def generate_unique_id():
    """Tạo ID duy nhất cho sản phẩm"""
    return str(uuid.uuid4())[:8]

def format_price(price):
    """Định dạng giá tiền theo chuẩn VND"""
    return f"{price:,}".replace(",", ".")

def create_category(category_name):
    """Tạo đối tượng category mới"""
    return {
        "category_id": f"cat{generate_unique_id()}",
        "name": category_name,
        "description": f"Sản phẩm {category_name} chất lượng cao",
        "products": []
    }

def format_lazada_data(input_file, output_file):
    """Chuyển đổi dữ liệu từ Lazada sang định dạng products.json"""
    with open(input_file, 'r', encoding='utf-8') as f:
        lazada_data = json.load(f)

    formatted_data = {
        "categories": []
    }

    categories_dict = {}

    for product in lazada_data:
        category_name = product['category']
        
        if category_name not in categories_dict:
            category = create_category(category_name)
            categories_dict[category_name] = category
            formatted_data['categories'].append(category)

        new_product = {
            "id": f"prod{generate_unique_id()}",
            "title": product['name'],
            "description": f"Sản phẩm {product['brand']} {product['name']} chất lượng cao",
            "price": format_price(product['price']),
            "features": [
                f"Thương hiệu: {product['brand']}",
                f"Danh mục: {product['category']}"
            ],
            "image_path": f"https://{product['image']}",
            "inventory": 10,
            "category_id": categories_dict[category_name]['category_id'],
            "category_name": category_name
        }

        if len(categories_dict[category_name]['products']) < 10:
            categories_dict[category_name]['products'].append(new_product)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(formatted_data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    input_file = "FormattedLazadaProductData.json"
    output_file = "formatted_products.json"
    format_lazada_data(input_file, output_file)
    print("Đã chuyển đổi dữ liệu thành công!") 