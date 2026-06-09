import base64, json
from openai import OpenAI
import os
from dotenv import load_dotenv, dotenv_values 

# loading variables from .env file
load_dotenv() 

# getting the API key from environment variables
api_key = os.getenv("API_KEY")



client = OpenAI(
    api_key=api_key,
    base_url="https://ws-ki005qo23xnwg4yq.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"
)

def extract_image_data(image_path):
    # detect media type based on file extension
    if image_path.endswith(".png"):
        media_type = "image/png"
    elif image_path.endswith(".jpg") or image_path.endswith(".jpeg"):
        media_type = "image/jpeg"
    else:
        raise ValueError("Unsupported image format. Only PNG and JPEG are supported.")
    
    with open(image_path, "rb") as image_file:
        image_data = base64.standard_b64encode(image_file.read()).decode('utf-8')
    return image_data, media_type

def extract_receipt_data(image_data, media_type):
    
    response = client.chat.completions.create(
        model="qwen-omni-turbo",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{media_type};base64,{image_data}"
                    }
                },
                {
                    "type": "text",
                    "text": """Extract the receipt data and return ONLY a JSON object with this structure, not in a code block. Tax is already included in total:
                    {
                        "store": "store name",
                        "date": "date of purchase",
                        "items": [{"name": "item", "price": 0.00}],
                        "subtotal": 0.00,
                        "tax": 0.00,
                        "total": 0.00
                    }"""
                }
            ]
        }]
    )
    return response.choices[0].message.content.replace("```json", "").replace("```", "").strip()

# test functionality
if __name__ == "__main__":

    image_path = "reciepts/aandklas_test.jpeg"
    
    image_data, media_type = extract_image_data(image_path)
    raw = extract_receipt_data(image_data, media_type)
    
    print(raw)
    parsed = json.loads(raw)
    print(json.dumps(parsed, indent=2))
