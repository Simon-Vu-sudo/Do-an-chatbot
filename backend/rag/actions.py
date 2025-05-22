from bson import ObjectId
import re
from .vector_store import vector_store_manager

class ActionHandler:
    
    def detect_action_intents(self, message):
        intents = []
        
        add_patterns = [
            r'add to( my)? cart',
            r'buy (this|that|it)',
            r'purchase (this|that|it)',
            r'get (this|that|it)',
            r'i want (to buy|to get|to purchase)',
            r'i would like (to buy|to get|to purchase)',
            r'add (it|this|that) to (my )?cart'
        ]
        
        for pattern in add_patterns:
            if re.search(pattern, message.lower()):
                intents.append("add_to_cart")
                break
        
        recommend_patterns = [
            r'recommend',
            r'suggest',
            r'what (products|items) (would you|can you|do you) (recommend|suggest)',
            r'what (should|can) i (buy|get|purchase)',
            r'show me (some|more) products',
            r'what (else|other products) do you have',
            r'similar products',
            r'alternatives'
        ]
        
        for pattern in recommend_patterns:
            if re.search(pattern, message.lower()):
                intents.append("recommend_products")
                break
        
        return intents
    
    def extract_product_id(self, message, db):
        id_match = re.search(r'product[_\s]?id[:\s]+([a-zA-Z0-9]+)', message.lower())
        if id_match:
            product_id = id_match.group(1)
            product = db.products.find_one({"_id": ObjectId(product_id)})
            if product:
                return product_id
        
        results = vector_store_manager.similarity_search(message, k=1)
        
        if results and results[0].metadata.get('type') == 'product':
            return results[0].metadata.get('id')
        
        return None
    
    def extract_quantity(self, message):
        quantity_patterns = [
            r'(\d+) (of these|of those|of this|of that|items?|products?|pieces?)',
            r'quantity[:\s]+(\d+)',
            r'qty[:\s]+(\d+)',
            r'buy (\d+)',
            r'get (\d+)',
            r'add (\d+)'
        ]
        
        for pattern in quantity_patterns:
            match = re.search(pattern, message.lower())
            if match:
                try:
                    return int(match.group(1))
                except ValueError:
                    pass
        
        return None
    
    def extract_category(self, message, db):
        category_match = re.search(r'category[:\s]+([a-zA-Z0-9]+)', message.lower())
        if category_match:
            category_id = category_match.group(1)
            category = db.categories.find_one({"_id": ObjectId(category_id)})
            if category:
                return category_id
        
        results = vector_store_manager.similarity_search(message, k=1)
        
        if results and results[0].metadata.get('type') == 'category':
            return results[0].metadata.get('id')
        
        return None
    
    def add_to_cart(self, db, product_id, quantity, user_id=None, session_id=None):
        try:
            product = db.products.find_one({"_id": ObjectId(product_id)})
            if not product:
                return False, "Product not found"
            
            if product.get('stock_count', 0) < quantity:
                return False, f"Not enough stock. Only {product.get('stock_count', 0)} available."
            
            cart_data = None
            if user_id:
                cart_data = db.carts.find_one({"user_id": user_id})
            elif session_id:
                cart_data = db.carts.find_one({"session_id": session_id})
            
            if not cart_data:
                return False, "Cart not found. Please refresh your session."
            
            from models.cart import Cart
            cart = Cart.from_dict(cart_data)
            cart.add_item(
                product_id, 
                quantity, 
                product.get('price'), 
                product.get('title')
            )
            
            db.carts.update_one({"_id": ObjectId(cart.id)}, {"$set": cart.to_dict()})
            
            return True, f"Added {quantity} of {product.get('title')} to your cart."
        
        except Exception as e:
            return False, str(e)
    
    def recommend_products(self, db, category_id=None, query=None, limit=3):
        try:
            if query:
                results = vector_store_manager.similarity_search(query, k=limit)
                
                product_results = [r for r in results if r.metadata.get('type') == 'product']
                
                recommendations = []
                for result in product_results:
                    product_id = result.metadata.get('id')
                    if product_id:
                        product = db.products.find_one({"_id": ObjectId(product_id)})
                        if product:
                            from models.product import Product
                            recommendations.append(Product.from_dict(product).to_json())
                
                return recommendations
            
            elif category_id:
                products = db.products.find({"category_id": category_id}).limit(limit)
                from models.product import Product
                return [Product.from_dict(p).to_json() for p in products]
            
            else:
                products = db.products.aggregate([{"$sample": {"size": limit}}])
                from models.product import Product
                return [Product.from_dict(p).to_json() for p in products]
        
        except Exception as e:
            print(f"Error recommending products: {e}")
            return []
