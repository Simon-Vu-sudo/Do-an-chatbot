import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/ecommerce")

# JWT configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "7080888e769af35267a78f129cbc2f18e0668d16d917129238f819f08d4da648855211c073b12a7ac8662f7d92a4cf64269a2068aabf03a933a329a804c1c1e5ab10392b26ea0cbf0264f54cec01eb7198fcf260733e2e30da572825c92d21091d89a99e5da475328da874ac4ce432da21355ff4e01ff6f0ba14478be307bacc255038955b1076c78e7956f1393a02c34113e7112792ba26f666237b24f083e7ae7144875e309c1c1ce2b59350db3fa4e945dc2134764f06732c3fdbae0604f3df68f82447e5a3e554e9dcf52b37811fd6dcd6c845d02265569808b51f4f5647fc6c51608185b6c7f13077c373d7467cbc9fe307a5f5f52970ec8934267e022a")
JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour

# Ollama configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")

# Vector store configuration
VECTOR_DB_PATH = os.getenv("VECTOR_DB_PATH", os.path.join(os.path.dirname(__file__), "../../data/vector_db"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")

# Session configuration
ANONYMOUS_SESSION_EXPIRY = 14  # days
