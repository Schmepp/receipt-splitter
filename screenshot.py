"""Capture screenshots of the app for the README."""
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = "http://localhost:5000/Bill-Scanner/"
OUT = Path("docs/screenshots")
OUT.mkdir(parents=True, exist_ok=True)

# Mock data that mirrors the sample receipt (reciepts/aandklas_test.jpeg)
INJECT_STATE = """() => {
    state.store = 'AANDKLAS';
    state.date = '07/06/2026';
    state.parsedSubtotal = 278.27;
    state.parsedTax = 41.73;
    state.parsedTotal = 320.00;
    state.tipPercent = 10;
    state.splitMethod = 'proportional';
    state.people = [
        { id: 'p1', name: 'Kira' },
        { id: 'p2', name: 'Gerrid' },
    ];
    state.items = [
        { id: 'i1', name: 'Slow Boat',           price: 42.00, assignedTo: ['p1'] },
        { id: 'i2', name: 'Frozen Pina Colada',  price: 42.00, assignedTo: ['p1'] },
        { id: 'i3', name: 'Flying Fish Lemon',   price: 34.00, assignedTo: ['p2'] },
        { id: 'i4', name: 'Nachos Half',          price: 80.00, assignedTo: ['p1', 'p2'] },
        { id: 'i5', name: 'Sun Funky chicken',   price: 80.00, assignedTo: ['p2'] },
        { id: 'i6', name: 'Long Island',           price: 42.00, assignedTo: ['p1'] },
    ];
    state.selectedPersonId = 'p1';
    renderApp();
}"""


def take_screenshots():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1100, "height": 820})
        page.goto(URL, wait_until="networkidle")

        # 01: clean upload state
        page.screenshot(path=str(OUT / "01-upload.png"))

        # inject mock state to simulate a parsed receipt
        page.evaluate(INJECT_STATE)
        page.wait_for_timeout(200)

        # 02: receipt details card (includes store info + people list)
        page.locator("#receiptDataCard").scroll_into_view_if_needed()
        page.wait_for_timeout(100)
        page.locator("#receiptDataCard").screenshot(path=str(OUT / "02-receipt-details.png"))

        # 03: items table with checkbox assignments
        page.locator("#itemsCard").scroll_into_view_if_needed()
        page.wait_for_timeout(100)
        page.locator("#itemsCard").screenshot(path=str(OUT / "03-items-assignments.png"))

        # 04: per-person results breakdown
        page.locator("#resultsCard").scroll_into_view_if_needed()
        page.wait_for_timeout(100)
        page.locator("#resultsCard").screenshot(path=str(OUT / "04-results.png"))

        browser.close()

    print(f"Screenshots saved to {OUT}/")


if __name__ == "__main__":
    take_screenshots()
