import os
from pymongo import MongoClient
from langchain_ollama import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.docstore.document import Document
import config

def get_data_from_mongodb():
    """Lấy dữ liệu từ MongoDB và định dạng lại theo cấu trúc mong muốn"""
    client = MongoClient(config.MONGO_URI)
    db = client.get_database()
    
    # Lấy tất cả categories
    categories = list(db.categorie.find())
    
    # Lấy tất cả products
    products = list(db.product.find())
    
    # Tạo cấu trúc dữ liệu mới
    formatted_data = {
        "categories": []
    }
    
    # Tạo dictionary để tra cứu category
    category_dict = {}
    for category in categories:
        category_id = str(category["_id"])
        category_dict[category_id] = {
            "category_id": category.get("original_id", category_id),
            "name": category["name"],
            "description": category.get("description", ""),
            "image_path": category.get("image_path", ""),
            "products": []
        }
        formatted_data["categories"].append(category_dict[category_id])
    
    # Thêm products vào categories tương ứng
    for product in products:
        category_id = product.get("category_id")
        if category_id and category_id in category_dict:
            product_data = {
                "id": product.get("original_product_id", str(product["_id"])),
                "title": product["title"],
                "description": product["description"],
                "price": product["price"],
                "features": product.get("features", []),
                "image_path": product.get("image_path", ""),
                "inventory": product.get("stock_count", 0),
                "category_id": category_id,
                "category_name": category_dict[category_id]["name"]
            }
            category_dict[category_id]["products"].append(product_data)
    
    
    return formatted_data

def create_vector_database(data, output_path):
    documents = []
    
    for category in data["categories"]:
        category_text = f"""
        Danh mục: {category['name']}
        Mô tả: {category['description']}
        Sản phẩm trong danh mục này: {', '.join([p['title'] for p in category['products']])}
        """
        
        category_metadata = {
            "id": category['category_id'],
            "type": "category",
            "name": category['name'],
            "image_path": category['image_path']
        }
        
        category_doc = Document(page_content=category_text, metadata=category_metadata)
        documents.append(category_doc)
        
        for product in category['products']:
            product_text = f"""
            Sản phẩm: {product['title']}
            Danh mục: {category['name']}
            Mô tả: {product['description']}
            Giá: {product['price']} ₫
            Đặc điểm: {', '.join(product['features'])}
            """
            
            product_metadata = {
                "id": product['id'],
                "type": "product",
                "title": product['title'],
                "category_id": category['category_id'],
                "category_name": category['name'],
                "price": product['price'],
                "image_path": product['image_path']
            }
            
            product_doc = Document(page_content=product_text, metadata=product_metadata)
            documents.append(product_doc)
    
    embeddings = OllamaEmbeddings(model="nomic-embed-text")

    if documents:
        try:
            sample_embedding = embeddings.embed_query(documents[0].page_content[:100])
        except Exception as e_embed_check:
            print(f"Lỗi e_embed_check: {e_embed_check}")
    
    db = FAISS.from_documents(documents, embeddings)
    print(f"Tạo FAISS index thành công. Index dimension (db.index.d): {db.index.d}")


    if os.path.dirname(output_path):
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
    else:
        os.makedirs(output_path, exist_ok=True)
    
    db.save_local(output_path)
    print(f"Đã tạo vector database tại: {output_path}")
    print(f"!!! QUAN TRỌNG: Số chiều của Vector DB vừa tạo là: {db.index.d}")
    
    return db

if __name__ == "__main__":
    # Lấy dữ liệu từ MongoDB
    data = get_data_from_mongodb()
    print(f"  formatted_data: {data}")
    
    # Tạo vector database
    output_path = config.VECTOR_DB_PATH
    db = create_vector_database(data, output_path)
    print(f"Đã tạo vector database tại: {output_path}") 