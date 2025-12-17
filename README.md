# BigCommerce Product CSV Exporter

Small Flask app to pull product data from BigCommerce, pick the fields you need, set their order, and export to CSV (preview + download).

## Setup
1. Python 3.10+ recommended.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set environment variables (create a `.env` or export directly):
   ```bash
   export BIGCOMMERCE_STORE_HASH=your_store_hash
   export BIGCOMMERCE_CLIENT_ID=your_client_id
   export BIGCOMMERCE_ACCESS_TOKEN=your_access_token
   ```
   The app automatically loads a `.env` file from the project root.

## Run
```bash
flask --app app run --debug
```
Then open http://localhost:5000.

## Usage
- Check the fields you want in the left column, reorder them with the arrows, and click **Export CSV**.
- Toggle **Include variant data** if you need variant SKUs/prices/details (slightly slower because of the extra API include).
- The next page previews the CSV and offers a **Download CSV** button.

## Notes
- The app pulls up to 2,000 products using paginated requests (250 per page). Adjust `fetch_products` if you need a different cap or page size.
- API failures will raise a runtime error; ensure your credentials have `catalog/products` read access.
