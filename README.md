# Split the Bill Calculator

Upload a receipt image, extract line items with the Flask backend, assign items to people, and split the total fairly.

## Features

- Receipt image upload and parsing
- Item assignment with checkboxes
- Even split for shared items
- Tip calculation
- South African Rand currency display
- Per-person receipt-style breakdown
- Manual item entry and item deletion

## Project structure

- `index.html` — UI
- `webapp.js` — Frontend logic
- `rest_server.py` — Flask API and static file serving
- `image_extraction.py` — Receipt parsing via the OCR/LLM backend

## Requirements

- Python 3.10+
- A valid `API_KEY` in a `.env` file for the receipt parsing backend

## Install

```bash
pip install -r requirements.txt
```

## Run

Start the Flask server:

```bash
python rest_server.py
```

Then open:

```text
http://127.0.0.1:5000
```

## Notes

- Enter at least one person’s name before calculating the split.
- Items selected by multiple people are split evenly.
- Tax is read from the receipt and included in the split.

## Roadmap

- Optional alternative OCR backend
- Better receipt parsing accuracy
- Export or print individual receipts
