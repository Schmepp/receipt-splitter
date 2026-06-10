import base64
import json
import os

# Try modern API first, fall back to old API
try:
    from openai import OpenAI
    USE_NEW_API = True
except (ImportError, ModuleNotFoundError):
    try:
        import openai
        USE_NEW_API = False
    except (ImportError, ModuleNotFoundError):
        openai = None
        OpenAI = None
        USE_NEW_API = False

try:
    from dotenv import load_dotenv
    load_dotenv()
except ModuleNotFoundError:
    pass

def get_client():
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise RuntimeError("API_KEY is not set in the environment or .env file.")

    if USE_NEW_API and OpenAI is not None:
        return OpenAI(
            api_key=api_key,
            base_url="https://ws-ki005qo23xnwg4yq.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
        )
    elif not USE_NEW_API and openai is not None:
        openai.api_key = api_key
        openai.api_base = "https://ws-ki005qo23xnwg4yq.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1"
        return None  # openai module doesn't need a client object
    else:
        raise RuntimeError(
            "The openai package is not installed. Run: pip3 install -r requirements.txt"
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
    get_client()
    
    if USE_NEW_API and OpenAI is not None:
        client = get_client()
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
    else:
        response = openai.ChatCompletion.create(
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
        return response.choices[0]["message"]["content"].replace("```json", "").replace("```", "").strip()

# test functionality
if __name__ == "__main__":

    image_path = "reciepts/aandklas_test.jpeg"
    
    image_data, media_type = extract_image_data(image_path)
    raw = extract_receipt_data(image_data, media_type)
    
    print(raw)
    parsed = json.loads(raw)
    print(json.dumps(parsed, indent=2))
