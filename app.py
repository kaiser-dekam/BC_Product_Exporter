import csv
import io
import os
from typing import Dict, List, Sequence

import requests
from dotenv import load_dotenv
from flask import (
    Flask,
    Response,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials as firebase_credentials
from firebase_admin import firestore

app = Flask(__name__)
load_dotenv()
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")

# Firebase Admin initialization
if not firebase_admin._apps:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    firebase_options = {}
    try:
        if cred_path:
            firebase_admin.initialize_app(
                firebase_credentials.Certificate(cred_path), firebase_options
            )
        else:
            firebase_admin.initialize_app()
    except Exception:
        # If initialization fails (e.g., missing credentials), leave Firebase disabled.
        pass

# Map friendly labels to BigCommerce product fields that we support exporting.
FIELD_OPTIONS: Dict[str, str] = {
    "id": "Product ID",
    "name": "Name",
    "sku": "SKU",
    "price": "Price",
    "sale_price": "Sale Price",
    "retail_price": "Retail Price",
    "map_price": "MAP Price",
    "cost_price": "Cost Price",
    "msrp": "MSRP",
    "tax_class_id": "Tax Class ID",
    "inventory_level": "Inventory",
    "type": "Type",
    "weight": "Weight",
    "width": "Width",
    "height": "Height",
    "depth": "Depth",
    "brand_id": "Brand ID",
    "brand_name": "Brand Name",
    "upc": "UPC",
    "mpn": "MPN",
    "gtin": "GTIN",
    "bin_picking_number": "Bin Picking Number",
    "categories": "Categories",
    "category_ids": "Category IDs",
    "primary_image_url": "Primary Image URL",
    "thumbnail_url": "Thumbnail URL",
    "image_urls": "Image URLs",
    "is_visible": "Is Visible",
    "is_featured": "Is Featured",
    "is_free_shipping": "Is Free Shipping",
    "availability": "Availability",
    "availability_description": "Availability Description",
    "condition": "Condition",
    "description": "Description",
    "warranty": "Warranty",
    "search_keywords": "Search Keywords",
    "custom_fields": "Custom Fields",
    "date_created": "Date Created",
    "date_modified": "Date Modified",
    "date_last_imported": "Date Last Imported",
    "total_sold": "Total Sold",
    "reviews_rating_sum": "Reviews Rating Sum",
    "reviews_count": "Reviews Count",
    "variant_skus": "Variant SKUs",
    "variant_prices": "Variant Prices",
    "variants": "Variants (JSON)",
    "custom_url": "Custom URL",
}


def get_bigcommerce_config(overrides: Dict[str, str] | None = None) -> Dict[str, str]:
    """Read required configuration from environment variables and optional overrides."""
    config = {
        "store_hash": os.getenv("BIGCOMMERCE_STORE_HASH", ""),
        "client_id": os.getenv("BIGCOMMERCE_CLIENT_ID", ""),
        "access_token": os.getenv("BIGCOMMERCE_ACCESS_TOKEN", ""),
    }
    if overrides:
        for key, value in overrides.items():
            if value:
                config[key] = value
    return config


def fetch_products(
    max_items: int = 2000,
    page_size: int = 250,
    include_variants: bool = False,
    config_override: Dict[str, str] | None = None,
) -> List[Dict]:
    """Fetch products from BigCommerce with pagination, up to max_items."""
    config = get_bigcommerce_config(config_override)
    missing = [key for key, value in config.items() if not value]
    if missing:
        raise RuntimeError(
            f"Missing BigCommerce configuration: {', '.join(missing)}. "
            "Set BIGCOMMERCE_STORE_HASH, BIGCOMMERCE_CLIENT_ID, and BIGCOMMERCE_ACCESS_TOKEN."
        )

    base_url = f"https://api.bigcommerce.com/stores/{config['store_hash']}/v3"
    endpoint = f"{base_url}/catalog/products"
    headers = {
        "X-Auth-Client": config["client_id"],
        "X-Auth-Token": config["access_token"],
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    # Categories come back on the base product payload; requesting as a sub-resource
    # triggers 422 on some stores, so avoid adding it to includes.
    include_params = ["images", "primary_image", "custom_fields"]
    if include_variants:
        include_params.extend(["variants", "options", "modifiers"])

    all_products: List[Dict] = []
    page = 1
    while len(all_products) < max_items:
        params = {
            "limit": page_size,
            "page": page,
            "include": ",".join(include_params),
        }
        response = requests.get(endpoint, headers=headers, params=params, timeout=30)
        if response.status_code != 200:
            raise RuntimeError(
                f"BigCommerce API error ({response.status_code}): {response.text}"
            )
        payload = response.json()
        data = payload.get("data", [])
        if not data:
            break
        all_products.extend(data)
        if len(data) < page_size:
            break
        page += 1

    return all_products[:max_items]


def filter_products(
    products: Sequence[Dict], include_unavailable: bool, include_hidden: bool
) -> List[Dict]:
    """Optionally drop unavailable or hidden products."""
    unavailable_values = {"disabled", "unavailable", "no", "false", "0"}
    filtered: List[Dict] = []
    for prod in products:
        prod = prod or {}
        availability = str(prod.get("availability", "")).lower()
        is_visible = prod.get("is_visible", True)
        if not include_unavailable and availability in unavailable_values:
            continue
        if not include_hidden and not is_visible:
            continue
        filtered.append(prod)
    return filtered


def fetch_brand_map(config_override: Dict[str, str] | None = None) -> Dict[int, str]:
    """Fetch brand IDs mapped to names."""
    config = get_bigcommerce_config(config_override)
    missing = [key for key, value in config.items() if not value]
    if missing:
        raise RuntimeError(
            f"Missing BigCommerce configuration: {', '.join(missing)}. "
            "Set BIGCOMMERCE_STORE_HASH, BIGCOMMERCE_CLIENT_ID, and BIGCOMMERCE_ACCESS_TOKEN."
        )
    base_url = f"https://api.bigcommerce.com/stores/{config['store_hash']}/v3"
    endpoint = f"{base_url}/catalog/brands"
    headers = {
        "X-Auth-Client": config["client_id"],
        "X-Auth-Token": config["access_token"],
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    brand_map: Dict[int, str] = {}
    page = 1
    while True:
        params = {"limit": 250, "page": page}
        response = requests.get(endpoint, headers=headers, params=params, timeout=30)
        if response.status_code != 200:
            raise RuntimeError(
                f"BigCommerce brand API error ({response.status_code}): {response.text}"
            )
        payload = response.json()
        data = payload.get("data", [])
        if not data:
            break
        for brand in data:
            brand_map[brand.get("id")] = brand.get("name", "")
        if len(data) < 250:
            break
        page += 1
    return brand_map


def build_csv_rows(
    products: Sequence[Dict],
    fields: Sequence[str],
    brand_map: Dict[int, str],
    custom_domain: str = "",
) -> str:
    """Build CSV content for the given products and field order."""
    def apply_domain(domain: str, url_value: str) -> str:
        if not domain:
            return url_value
        if not url_value:
            return ""
        if url_value.startswith("http://") or url_value.startswith("https://"):
            return url_value
        domain_clean = domain.rstrip("/")
        path = url_value if url_value.startswith("/") else f"/{url_value}"
        return f"{domain_clean}{path}"

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([FIELD_OPTIONS.get(field, field) for field in fields])

    for product in products:
        product = product or {}
        row = []
        for field in fields:
            primary_image = product.get("primary_image") or {}
            if field == "primary_image_url":
                value = primary_image.get("url_standard", "")
            elif field == "thumbnail_url":
                value = primary_image.get("url_thumbnail", "")
            elif field == "image_urls":
                images = product.get("images") or []
                value = ", ".join((img or {}).get("url_standard", "") for img in images if img is not None)
            elif field == "brand_name":
                brand_id = product.get("brand_id")
                value = brand_map.get(brand_id, "")
            elif field == "category_ids":
                categories = product.get("categories") or []
                value = ", ".join(str(cat_id) for cat_id in categories)
            elif field == "custom_fields":
                custom_fields = product.get("custom_fields") or []
                parts = []
                for cf in custom_fields:
                    name = cf.get("name", "")
                    cf_value = cf.get("value", "")
                    parts.append(f"{name}: {cf_value}" if name else cf_value)
                value = "; ".join(parts)
            elif field == "variant_skus":
                variants = product.get("variants") or []
                value = ", ".join(variant.get("sku", "") for variant in variants if variant)
            elif field == "variant_prices":
                variants = product.get("variants") or []
                value = ", ".join(
                    str(variant.get("price", "")) for variant in variants if variant
                )
            elif field == "variants":
                variants = product.get("variants") or []
                value = str(variants)
            elif field == "custom_url":
                custom = product.get("custom_url") or {}
                raw_url = ""
                if isinstance(custom, dict):
                    raw_url = custom.get("url", "") or custom.get("path", "") or ""
                else:
                    raw_url = str(custom)
                value = apply_domain(custom_domain, raw_url)
            else:
                value = product.get(field, "")
            if isinstance(value, list):
                value = ", ".join(str(item) for item in value)
            elif isinstance(value, dict):
                value = value.get("url", "") if field == "custom_url" else str(value)
            row.append(value)
        writer.writerow(row)

    return buffer.getvalue()


@app.route("/", methods=["GET"])
def index():
    firebase_config = {
        "apiKey": os.getenv("FIREBASE_API_KEY", ""),
        "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN", ""),
        "projectId": os.getenv("FIREBASE_PROJECT_ID", ""),
        "appId": os.getenv("FIREBASE_APP_ID", ""),
    }
    saved_creds = session.get("bc_credentials", {})
    return render_template(
        "index.html",
        field_options=FIELD_OPTIONS,
        firebase_config=firebase_config,
        saved_creds=saved_creds,
    )


def _firestore_client():
    try:
        return firestore.client()
    except Exception:
        return None


def _verify_id_token(id_token: str) -> str:
    """Return UID from a Firebase ID token, or raise."""
    decoded = firebase_auth.verify_id_token(id_token)
    return decoded.get("uid", "")


@app.route("/api/save_creds", methods=["POST"])
def save_creds():
    payload = request.get_json(force=True, silent=True) or {}
    id_token = payload.get("id_token", "")
    store_hash = payload.get("store_hash", "")
    client_id = payload.get("client_id", "")
    access_token = payload.get("access_token", "")
    if not id_token or not (store_hash and client_id and access_token):
        return jsonify({"error": "Missing token or credentials"}), 400
    db = _firestore_client()
    if not db:
        return jsonify({"error": "Firestore not available"}), 503
    try:
        uid = _verify_id_token(id_token)
    except Exception as exc:  # pylint: disable=broad-except
        return jsonify({"error": f"Invalid ID token: {exc}"}), 401
    doc_ref = db.collection("user_credentials").document(uid)
    doc_ref.set(
        {
            "store_hash": store_hash,
            "client_id": client_id,
            "access_token": access_token,
        }
    )
    return jsonify({"status": "saved"})


@app.route("/api/load_creds", methods=["POST"])
def load_creds():
    payload = request.get_json(force=True, silent=True) or {}
    id_token = payload.get("id_token", "")
    if not id_token:
        return jsonify({"error": "Missing token"}), 400
    db = _firestore_client()
    if not db:
        return jsonify({"error": "Firestore not available"}), 503
    try:
        uid = _verify_id_token(id_token)
    except Exception as exc:  # pylint: disable=broad-except
        return jsonify({"error": f"Invalid ID token: {exc}"}), 401
    doc_ref = db.collection("user_credentials").document(uid)
    doc = doc_ref.get()
    if not doc.exists:
        return jsonify({"status": "not_found"})
    data = doc.to_dict() or {}
    return jsonify(
        {
            "status": "found",
            "store_hash": data.get("store_hash", ""),
            "client_id": data.get("client_id", ""),
            "access_token": data.get("access_token", ""),
        }
    )


@app.route("/export", methods=["POST"])
def export():
    ordered_fields_raw = request.form.get("ordered_fields", "")
    include_variants = request.form.get("include_variants") == "on"
    include_unavailable = request.form.get("include_unavailable") == "on"
    include_hidden = request.form.get("include_hidden") == "on"
    custom_domain = request.form.get("custom_domain", "").strip()
    store_hash = request.form.get("store_hash", "").strip()
    client_id = request.form.get("client_id", "").strip()
    access_token = request.form.get("access_token", "").strip()
    fields = [field for field in ordered_fields_raw.split(",") if field]
    if not fields:
        return redirect(url_for("index"))

    creds_override = {}
    if store_hash:
        creds_override["store_hash"] = store_hash
    if client_id:
        creds_override["client_id"] = client_id
    if access_token:
        creds_override["access_token"] = access_token
    if creds_override:
        session["bc_credentials"] = creds_override
    elif session.get("bc_credentials"):
        creds_override = session["bc_credentials"]

    products = fetch_products(
        include_variants=include_variants, config_override=creds_override
    )
    products = filter_products(
        products,
        include_unavailable=include_unavailable,
        include_hidden=include_hidden,
    )
    brand_map = fetch_brand_map(config_override=creds_override)
    csv_content = build_csv_rows(
        products, fields, brand_map, custom_domain=custom_domain
    )
    preview_rows = list(csv.reader(io.StringIO(csv_content)))
    field_query = ",".join(fields)

    return render_template(
        "export.html",
        csv_content=csv_content,
        fields=field_query,
        include_variants=int(include_variants),
        include_unavailable=int(include_unavailable),
        include_hidden=int(include_hidden),
        custom_domain=custom_domain,
        store_hash_value=creds_override.get("store_hash", ""),
        client_id_value=creds_override.get("client_id", ""),
        access_token_value=creds_override.get("access_token", ""),
        preview_rows=preview_rows,
    )


@app.route("/download")
def download():
    field_query = request.args.get("fields", "")
    include_variants = request.args.get("include_variants", "0") == "1"
    include_unavailable = request.args.get("include_unavailable", "0") == "1"
    include_hidden = request.args.get("include_hidden", "0") == "1"
    custom_domain = request.args.get("custom_domain", "").strip()
    store_hash = request.args.get("store_hash", "").strip()
    client_id = request.args.get("client_id", "").strip()
    access_token = request.args.get("access_token", "").strip()
    fields = [field for field in field_query.split(",") if field]
    if not fields:
        return redirect(url_for("index"))

    creds_override = {}
    if store_hash:
        creds_override["store_hash"] = store_hash
    if client_id:
        creds_override["client_id"] = client_id
    if access_token:
        creds_override["access_token"] = access_token
    if not creds_override and session.get("bc_credentials"):
        creds_override = session["bc_credentials"]

    products = fetch_products(
        include_variants=include_variants, config_override=creds_override
    )
    products = filter_products(
        products,
        include_unavailable=include_unavailable,
        include_hidden=include_hidden,
    )
    brand_map = fetch_brand_map(config_override=creds_override)
    csv_content = build_csv_rows(
        products, fields, brand_map, custom_domain=custom_domain
    )
    response = Response(csv_content, mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=products.csv"
    return response


@app.route("/logout", methods=["POST"])
def logout():
    """Clear stored credentials from the session."""
    session.pop("bc_credentials", None)
    return jsonify({"status": "logged_out"})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=2000)
