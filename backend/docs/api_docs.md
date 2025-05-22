# E-commerce Application API Documentation

## Base URL

```http
http://localhost:5000/api
```

## Authentication

- All endpoints are accessible without authentication
- Authentication is optional for registered users
- Use Bearer token for authenticated requests

## Rate Limiting

- 100 requests per minute for unauthenticated users
- 500 requests per minute for authenticated users

## Error Responses

All error responses follow this format:

```json
{
    "error": "Error message",
    "status": 400
}
```

## API Endpoints

### Chat API

#### 1. Get/Create Chat Session

```http
GET /chat/session
```

#### Session Headers

- `Authorization`: Bearer "token" (Optional)
- `X-Session-ID`: "session_id" (Optional)

#### Session Response

```json
{
    "chat_session": {
        "id": "session_id",
        "user_id": "user_id" | null,
        "session_id": "session_id",
        "is_anonymous": true | false,
        "cart_id": "cart_id" | null,
        "messages": [
            {
                "role": "assistant" | "user",
                "content": "message_content",
                "timestamp": "timestamp"
            }
        ]
    },
    "session_id": "session_id"
}
```

#### 2. Send Message

```http
POST /chat/message
```

#### Message Headers

- `Authorization`: Bearer "token" (Optional)
- `X-Session-ID`: "session_id" (Required if not authenticated)

#### Message Request

```json
{
    "message": "user_message"
}
```

#### Message Response

```json
{
    "response": "assistant_response",
    "chat_session": {
        "id": "session_id",
        "messages": [...]
    }
}
```

#### 3. Get Chat History

```http
GET /chat/history
```

#### History Headers

- `Authorization`: Bearer "token" (Optional)
- `X-Session-ID`: "session_id" (Required if not authenticated)

#### History Response

```json
{
    "messages": [
        {
            "role": "assistant" | "user",
            "content": "message_content",
            "timestamp": "timestamp"
        }
    ]
}
```

### Product API

#### 1. Get All Products

```http
GET /products
```

#### Products Filters

- `category`: Filter by category ID
- `limit`: Number of products to return
- `offset`: Offset for pagination

#### Products List Response

```json
{
    "products": [
        {
            "id": "product_id",
            "title": "product_title",
            "description": "product_description",
            "price": "product_price",
            "features": ["feature1", "feature2"],
            "image_path": "image_url",
            "category": "category_id",
            "stock": true | false
        }
    ]
}
```

#### 2. Get Product by ID

```http
GET /products/:id
```

#### Product Detail Response

```json
{
    "product": {
        "id": "product_id",
        "title": "product_title",
        "description": "product_description",
        "price": "product_price",
        "features": ["feature1", "feature2"],
        "image_path": "image_url",
        "category": "category_id",
        "stock": true | false
    }
}
```

### Category API

#### 1. Get All Categories

```http
GET /categories
```

#### Categories List Response

```json
{
    "categories": [
        {
            "id": "category_id",
            "name": "category_name",
            "description": "category_description"
        }
    ]
}
```

### Cart API

#### 1. Get Cart

```http
GET /cart
```

#### Cart Headers

- `Authorization`: Bearer "token" (Optional)
- `X-Session-ID`: "session_id" (Required if not authenticated)

#### Cart Response

```json
{
    "cart": {
        "id": "cart_id",
        "items": [
            {
                "product_id": "product_id",
                "quantity": 1,
                "product": {
                    "id": "product_id",
                    "title": "product_title",
                    "price": "product_price"
                }
            }
        ],
        "total": "cart_total"
    }
}
```

#### 2. Add to Cart

```http
POST /cart/items
```

#### Add Item Headers

- `Authorization`: Bearer "token" (Optional)
- `X-Session-ID`: "session_id" (Required if not authenticated)

#### Add Item Request

```json
{
    "product_id": "product_id",
    "quantity": 1
}
```

#### Add Item Response

```json
{
    "cart": {
        "id": "cart_id",
        "items": [...],
        "total": "cart_total"
    }
}
```

#### 3. Remove from Cart

```http
DELETE /cart/items/:product_id
```

#### Remove Item Headers

- `Authorization`: Bearer "token" (Optional)
- `X-Session-ID`: "session_id" (Required if not authenticated)

#### Remove Item Response

```json
{
    "cart": {
        "id": "cart_id",
        "items": [...],
        "total": "cart_total"
    }
}
```

### Authentication API

#### 1. Register User

```http
POST /auth/register
```

#### Registration Request

```json
{
    "email": "user_email",
    "password": "user_password",
    "full_name": "user_full_name"
}
```

#### Registration Response

```json
{
    "token": "jwt_token"
}
```

#### 2. Login User

```http
POST /auth/login
```

#### Login Request

```json
{
    "email": "user_email",
    "password": "user_password"
}
```

#### Login Response

```json
{
    "token": "jwt_token"
}
```

## WebSocket API

### Chat WebSocket

```http
ws://localhost:5000/ws/chat
```

#### WebSocket Connection

- `session_id`: Required for anonymous users
- `token`: Required for authenticated users

#### WebSocket Message

```json
{
    "type": "message" | "typing" | "action",
    "content": "message_content",
    "role": "user" | "assistant"
}
```

## Environment Variables

```bash
# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/ecommerce

# JWT Configuration
JWT_SECRET_KEY=your_secret_key
JWT_EXPIRATION=3600

# Application Configuration
DEBUG=True
PORT=5000
HOST=0.0.0.0
```

## Security Considerations

1. All sensitive data is encrypted
2. JWT tokens have a 1-hour expiration
3. Passwords are hashed using bcrypt
4. Rate limiting is implemented
5. Input validation is enforced
6. CORS is configured for security

## API Versioning

The API uses URL path versioning:

```http
/api/v1/
```

## Response Codes

- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error
