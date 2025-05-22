import requests
import json
import config
import os
import re
from langchain.prompts import PromptTemplate
from langchain_community.llms import Ollama
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains import RetrievalQA
from langchain.callbacks.base import BaseCallbackHandler

# --- Prompt Templates ---
def get_query_classification_prompt_template():
    """Prompt template to classify user query as category or product related in Vietnamese."""
    template = """
Trong câu hỏi có mà đề cập đến giá tiền hoặc hãng thì sẽ là câu hỏi về các sản phẩm hoặc một sản phẩm cụ thể nếu không thì là danh mục.
Chỉ trả lời bằng MỘT TỪ DUY NHẤT: "category" nếu đó là câu hỏi về danh mục, hoặc "product" nếu đó là câu hỏi về các sản phẩm.

Câu hỏi người dùng: "{query}"
Phân loại:
"""
    return PromptTemplate(template=template, input_variables=["query"])

def get_category_prompt_template():
    """Prompt template for category browsing in Vietnamese."""
    template = """
Bạn là trợ lý thương mại điện tử hữu ích giúp khách hàng Việt Nam tìm sản phẩm.
Sử dụng thông tin sau về danh mục sản phẩm:

{context}

**Quan trọng: Chỉ sử dụng thông tin được cung cấp trong {context} ở trên để trả lời. Không được bịa đặt hoặc sử dụng kiến thức bên ngoài.**

Sử dụng trường name để làm tên danh mục và tìm kiếm những thông tin liên quan đến danh mục đó.
Nếu người dùng không chắc họ muốn danh mục nào, hãy yêu cầu làm rõ và đề xuất các danh mục.
Nếu người dùng không đề cập là họ muốn danh mục nào và không hỏi thẳng vào tên của một sản phẩm, hãy yêu cầu làm rõ và đề xuất các danh mục.
Chỉ hiện 5 danh mục và hãy cho 2 ví dụ có tên sản phẩm thuộc danh mục đó.

Nếu yêu cầu của người dùng dường như liên quan đến một sản phẩm cụ thể hơn là danh mục, gợi ý họ duyệt danh mục liên quan trước hoặc hỏi về sản phẩm cụ thể.

Câu hỏi của người dùng: {question}
"""
    return PromptTemplate(template=template, input_variables=["context", "question"])

def get_product_prompt_template():
    """Prompt template for specific product recommendations in Vietnamese."""
    template = """
Bạn là trợ lý thương mại điện tử hữu ích đề xuất sản phẩm dựa trên yêu cầu của người dùng Việt Nam.
Bạn sẽ hỗ trợ người dùng tìm sản phẩm phù hợp với nhu cầu của họ hoàn toàn bằng tiếng việt.
Sử dụng thông tin sau về sản phẩm:

{context}

Người dùng đang hỏi về sản phẩm trong một danh mục cụ thể. Hãy trả lời bằng tiếng Việt và gợi ý các sản phẩm phù hợp. Đối với mỗi sản phẩm, hãy bao gồm:
- Tên sản phẩm
- Giá bán
- Tính năng hoặc lợi ích chính
- Giải thích ngắn gọn tại sao sản phẩm này phù hợp với nhu cầu của người dùng

Định dạng câu trả lời thành danh sách đánh số các đề xuất.
Chỉ đề xuất sản phẩm phù hợp với danh mục mà người dùng đang hỏi.
Nếu người dùng không chắc họ muốn danh mục nào, hãy yêu cầu làm rõ và đề xuất các danh mục.

Câu hỏi của người dùng: {question}
"""
    return PromptTemplate(template=template, input_variables=["context", "question"])

# --- Streaming Callback Handler ---
class StreamingCallbackHandlerForChat(BaseCallbackHandler):
    def __init__(self, stream_fn):
        self.stream_fn = stream_fn
        self.response_accumulator = []
        self.in_tool_call = False

    def on_llm_new_token(self, token: str, **kwargs) -> None:

        if not self.in_tool_call:
            try:
                self.stream_fn(token)
            except Exception as e:
                print(f"Error StreamingCallbackHandlerForChat: {e}")
        
        self.response_accumulator.append(token)

    def on_tool_start(self) -> None:
        self.in_tool_call = True

    def on_tool_end(self, output, **kwargs) -> None:
        self.in_tool_call = False

    def get_full_response(self) -> str:
        full_response = "".join(self.response_accumulator)
        return full_response.strip()


class ChatManager:
    def __init__(self):
        #Khai báo các biến
        self.base_url = config.OLLAMA_BASE_URL
        self.model_name = config.OLLAMA_MODEL
        self.embed_model_name = config.EMBEDDING_MODEL
        self.vector_db_path = getattr(config, 'VECTOR_DB_PATH', 'vector_db')

        self.llm = Ollama(model=self.model_name, base_url=self.base_url)
        self.embeddings = OllamaEmbeddings(model=self.embed_model_name)
        
        self.vector_db = FAISS.load_local(
            self.vector_db_path,
            self.embeddings, 
            allow_dangerous_deserialization=True
        )

        self.query_classification_prompt = get_query_classification_prompt_template()
        self.category_prompt = get_category_prompt_template()
        self.product_prompt = get_product_prompt_template()

    def _is_asking_product(self, query: str) -> bool:
        prompt_string = self.query_classification_prompt.format(query=query)
    
        response = self.llm.invoke(prompt_string)
        
        is_product = isinstance(response, str) == 'product'
        
        return is_product

    def process_message(self, session_id: str, message: str, stream_callback: callable = None):
        is_product = self._is_asking_product(message)
        
        retriever = None
        prompt = None

        #Phân biệt sản phẩm và danh mục
        if is_product:
            retriever = self.vector_db.as_retriever(search_kwargs={"k": 1, "filter": {"type": "product"}})
            prompt = self.product_prompt
        else:
            retriever = self.vector_db.as_retriever(
                search_kwargs={"k": 1, "filter": {"type": "category"}}
            )
            prompt = self.category_prompt

        streaming_handler = StreamingCallbackHandlerForChat(stream_callback)

        #Khai báo model
        streaming_llm = Ollama(
            model=self.model_name, 
            base_url=self.base_url, 
            callbacks=[streaming_handler]
        )

        #Thực hiện quá trình tìm kiếm
        qa_chain = RetrievalQA.from_chain_type(
            llm=streaming_llm,
            chain_type="stuff",
            retriever=retriever,
            chain_type_kwargs={"prompt": prompt},
            return_source_documents=False 
        )
        
        qa_chain.invoke({"query": message}) 
        full_response = streaming_handler.get_full_response()
        return full_response
            