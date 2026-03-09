import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
// LETTER = 612 × 792 pt.
// 0.25" margins = 18 pt → content area 576 × 756 pt.
// Footer 14 pt → usable 742 pt.
// Column headers (fixed) 14 pt + 2 pt gap = 16 pt → body 726 pt.
// Target: 15 products per page.
// 15 × 47 pt rows + 14 × 1 pt gaps = 719 pt → fits in 726 pt.
//
// Each row: image (38 pt) + info area (532 pt).
// Info area layout (top → bottom):
//   Name / SKU / Price line …… ~8 pt
//   6 bullet lines at 5.5 pt font, 6 pt line-height …… 36 pt
//   Padding …… ~3 pt
//   Total ≈ 47 pt ✓
//
// Bullets use full 532 pt width → ~100+ chars per line at 5.5 pt Helvetica.
// AI prompt limits each bullet to 90 chars, so no truncation needed.

const MARGIN = 18; // 0.25"
const CONTENT_WIDTH = 612 - MARGIN * 2; // 576 pt
const ROW_HEIGHT = 47;
const ROW_GAP = 1;
const FOOTER_HEIGHT = 14;

// Image
const IMAGE_SIZE = 38;
const IMAGE_GAP = 6;

// Info area = CONTENT_WIDTH - IMAGE_SIZE - IMAGE_GAP = 532 pt
const INFO_WIDTH = CONTENT_WIDTH - IMAGE_SIZE - IMAGE_GAP;

// Top-line columns inside info area
const SKU_COL = 80;
const PRICE_COL = 55;
const NAME_COL = INFO_WIDTH - SKU_COL - PRICE_COL; // ~397 pt

// Bullet font
const BULLET_FONT = 5.5;
const BULLET_LINE_HEIGHT = 6; // pt absolute

// Max characters per bullet (matches AI prompt constraint of 90 chars)
const BULLET_MAX_CHARS = 90;

// Two-column layout constants
// Each column: (576 - 8 gap) / 2 = 284 pt
const COL_GAP = 8;
const COL_WIDTH = (CONTENT_WIDTH - COL_GAP) / 2; // 284 pt
const IMG_SIZE_2COL = 28;
const IMG_GAP_2COL = 4;
const INFO_WIDTH_2COL = COL_WIDTH - IMG_SIZE_2COL - IMG_GAP_2COL; // 252 pt
const SKU_COL_2COL = 55;
const PRICE_COL_2COL = 42;
const NAME_COL_2COL = INFO_WIDTH_2COL - SKU_COL_2COL - PRICE_COL_2COL; // 155 pt
const BULLET_MAX_CHARS_2COL = 65; // narrower column → fewer chars per line

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    paddingTop: MARGIN,
    paddingBottom: MARGIN + FOOTER_HEIGHT,
    paddingHorizontal: MARGIN,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },

  // Cover -------------------------------------------------------------------
  coverPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 60,
    backgroundColor: "#ffffff",
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    color: "#111827",
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#6b7280",
  },

  // Section header ----------------------------------------------------------
  sectionHeader: {
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: "#2563eb",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  sectionProductCount: {
    fontSize: 6.5,
    color: "#1a1a1a",
    marginTop: 1,
  },

  // Inline headers (H1, H2, H3) --------------------------------------------
  headerH1: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 5,
    marginBottom: 2,
  },
  headerH2: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 4,
    marginBottom: 2,
  },
  headerH3: {
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginTop: 3,
    marginBottom: 1,
  },

  // Column header row (repeats each page) -----------------------------------
  columnHeader: {
    flexDirection: "row",
    alignItems: "center",
    height: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
    marginBottom: 2,
  },
  colHeaderImage: {
    width: IMAGE_SIZE + IMAGE_GAP,
  },
  colHeaderName: {
    width: NAME_COL,
    fontSize: 6,
    fontWeight: "bold",
    color: "#1a1a1a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colHeaderSku: {
    width: SKU_COL,
    fontSize: 6,
    fontWeight: "bold",
    color: "#1a1a1a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colHeaderPrice: {
    width: PRICE_COL,
    fontSize: 6,
    fontWeight: "bold",
    color: "#1a1a1a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "right",
  },

  // Product row (horizontal, full-width) ------------------------------------
  productRow: {
    flexDirection: "row",
    height: ROW_HEIGHT,
    marginBottom: ROW_GAP,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  productImageCol: {
    width: IMAGE_SIZE,
    marginRight: IMAGE_GAP,
    paddingTop: 3,
  },
  productImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    objectFit: "contain",
    borderRadius: 3,
    backgroundColor: "#f9fafb",
  },
  productImagePlaceholder: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 3,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  productInfoCol: {
    width: INFO_WIDTH,
    paddingTop: 2,
    overflow: "hidden",
  },

  // Top line: name | sku | price
  topLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 1,
  },
  productName: {
    width: NAME_COL,
    fontSize: 7.5,
    fontWeight: "bold",
    lineHeight: 1.15,
  },
  productSku: {
    width: SKU_COL,
    fontSize: 6.5,
    color: "#1a1a1a",
  },
  productPrice: {
    width: PRICE_COL,
    fontSize: 8.5,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "right",
  },

  // Bullet area: single column, full info width
  bulletArea: {
    // full width of info col, stacks vertically
  },
  bulletRow: {
    flexDirection: "row",
    height: BULLET_LINE_HEIGHT,
  },
  bulletDot: {
    fontSize: BULLET_FONT,
    color: "#1a1a1a",
    width: 8,
  },
  bulletText: {
    fontSize: BULLET_FONT,
    lineHeight: BULLET_LINE_HEIGHT / BULLET_FONT,
    color: "#1a1a1a",
  },

  // Footer ------------------------------------------------------------------
  footer: {
    position: "absolute",
    bottom: MARGIN,
    left: MARGIN,
    right: MARGIN,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6.5,
    color: "#1a1a1a",
  },
  pageNumber: {
    fontSize: 6.5,
    color: "#1a1a1a",
  },

  // Two-column layout -------------------------------------------------------
  twoColPair: {
    flexDirection: "row",
    height: ROW_HEIGHT,
    marginBottom: ROW_GAP,
  },
  twoColSpacer: {
    width: COL_GAP,
  },
  productRow2col: {
    width: COL_WIDTH,
    flexDirection: "row",
    height: ROW_HEIGHT,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  productImageCol2col: {
    width: IMG_SIZE_2COL,
    marginRight: IMG_GAP_2COL,
    paddingTop: 3,
  },
  productImage2col: {
    width: IMG_SIZE_2COL,
    height: IMG_SIZE_2COL,
    objectFit: "contain",
    borderRadius: 2,
    backgroundColor: "#f9fafb",
  },
  productImagePlaceholder2col: {
    width: IMG_SIZE_2COL,
    height: IMG_SIZE_2COL,
    borderRadius: 2,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  productInfoCol2col: {
    width: INFO_WIDTH_2COL,
    paddingTop: 2,
    overflow: "hidden",
  },
  productName2col: {
    width: NAME_COL_2COL,
    fontSize: 7,
    fontWeight: "bold",
    lineHeight: 1.15,
  },
  productSku2col: {
    width: SKU_COL_2COL,
    fontSize: 6,
    color: "#1a1a1a",
  },
  productPrice2col: {
    width: PRICE_COL_2COL,
    fontSize: 7.5,
    fontWeight: "bold",
    color: "#1a1a1a",
    textAlign: "right",
  },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProductItem {
  type: "product";
  product_cache_id: string;
  name: string;
  sku: string;
  price: number;
  primary_image_url: string;
  claude_summary: string | null;
  user_description?: string | null;
  description_source?: "ai" | "custom";
  weight?: number;
  width?: number;
  height?: number;
  depth?: number;
}

interface HeaderItem {
  type: "header";
  id: string;
  level: 1 | 2 | 3;
  text: string;
}

type SectionItem = ProductItem | HeaderItem;

interface BookSection {
  id: string;
  title: string;
  items: SectionItem[];
  layout?: "1-col" | "2-col";
}

interface BookPdfProps {
  title: string;
  subtitle: string;
  sections: BookSection[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Truncate text to a max length. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "\u2026";
}

/**
 * Parse an AI summary string into individual bullet points.
 * Handles formats: "- text", "• text", "* text", "1. text", and plain lines.
 * Falls back to sentence splitting for paragraph-style text.
 * Returns up to 6 items.
 */
function parseBullets(summary: string): string[] {
  // Split on newlines and clean up
  const rawLines = summary
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Strip bullet / number markers and markdown bold
  const cleaned = rawLines
    .map((l) =>
      l
        .replace(/^[-–—•*]\s*/, "")
        .replace(/^\d+[.)]\s*/, "")
        .replace(/\*\*(.+?)\*\*/g, "$1") // strip markdown bold
        .trim()
    )
    .filter(Boolean);

  if (cleaned.length >= 2) {
    return cleaned.slice(0, 6);
  }

  // Fallback: split paragraph on sentences
  const sentences = summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  return sentences.slice(0, 6);
}

// ---------------------------------------------------------------------------
// 2-col helpers
// ---------------------------------------------------------------------------
type Pair =
  | { kind: "header"; item: HeaderItem; key: string }
  | { kind: "pair"; left: ProductItem; right: ProductItem | null; key: string };

function buildPairs(items: SectionItem[]): Pair[] {
  const result: Pair[] = [];
  let pending: ProductItem | null = null;

  for (const item of items) {
    if (item.type === "header") {
      if (pending) {
        result.push({ kind: "pair", left: pending, right: null, key: `pair-${pending.product_cache_id}` });
        pending = null;
      }
      result.push({ kind: "header", item, key: item.id });
    } else {
      if (pending) {
        result.push({ kind: "pair", left: pending, right: item, key: `pair-${pending.product_cache_id}` });
        pending = null;
      } else {
        pending = item;
      }
    }
  }
  if (pending) {
    result.push({ kind: "pair", left: pending, right: null, key: `pair-${pending.product_cache_id}-last` });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Product cell for 2-col layout
// ---------------------------------------------------------------------------
function ProductCell2Col({ product }: { product: ProductItem }) {
  const effectiveDescription =
    product.description_source === "custom" && product.user_description
      ? product.user_description
      : product.claude_summary;
  const bullets = effectiveDescription ? parseBullets(effectiveDescription) : [];

  return (
    <View style={styles.productRow2col}>
      {/* Image */}
      <View style={styles.productImageCol2col}>
        {product.primary_image_url ? (
          <Image src={product.primary_image_url} style={styles.productImage2col} />
        ) : (
          <View style={styles.productImagePlaceholder2col}>
            <Text style={{ fontSize: 4, color: "#1a1a1a" }}>No img</Text>
          </View>
        )}
      </View>

      {/* Info area */}
      <View style={styles.productInfoCol2col}>
        <View style={styles.topLine}>
          <Text style={styles.productName2col}>{truncate(product.name, 40)}</Text>
          <Text style={styles.productSku2col}>{product.sku || ""}</Text>
          <Text style={styles.productPrice2col}>${product.price.toFixed(2)}</Text>
        </View>

        {bullets.length > 0 && (
          <View style={styles.bulletArea}>
            {bullets.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>{"•"}</Text>
                <Text style={styles.bulletText}>{truncate(b, BULLET_MAX_CHARS_2COL)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Product row (horizontal with full-width bullet points)
// ---------------------------------------------------------------------------
function ProductRow({ product }: { product: ProductItem }) {
  const effectiveDescription =
    product.description_source === "custom" && product.user_description
      ? product.user_description
      : product.claude_summary;
  const bullets = effectiveDescription ? parseBullets(effectiveDescription) : [];

  return (
    <View style={styles.productRow} wrap={false}>
      {/* Image */}
      <View style={styles.productImageCol}>
        {product.primary_image_url ? (
          <Image src={product.primary_image_url} style={styles.productImage} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Text style={{ fontSize: 5, color: "#1a1a1a" }}>No img</Text>
          </View>
        )}
      </View>

      {/* Info area */}
      <View style={styles.productInfoCol}>
        {/* Top line: Name | SKU | Price */}
        <View style={styles.topLine}>
          <Text style={styles.productName}>
            {truncate(product.name, 70)}
          </Text>
          <Text style={styles.productSku}>
            {product.sku || ""}
          </Text>
          <Text style={styles.productPrice}>
            ${product.price.toFixed(2)}
          </Text>
        </View>

        {/* Bullet points — single column, full width */}
        {bullets.length > 0 && (
          <View style={styles.bulletArea}>
            {bullets.map((b, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>{"•"}</Text>
                <Text style={styles.bulletText}>
                  {truncate(b, BULLET_MAX_CHARS)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Header block
// ---------------------------------------------------------------------------
function HeaderBlock({ header }: { header: HeaderItem }) {
  if (!header.text) return null;
  const headerStyle =
    header.level === 1
      ? styles.headerH1
      : header.level === 2
      ? styles.headerH2
      : styles.headerH3;

  return (
    <View wrap={false}>
      <Text style={headerStyle}>{header.text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Column header row (repeats on each page)
// ---------------------------------------------------------------------------
function ColumnHeaders() {
  return (
    <View style={styles.columnHeader} fixed>
      <View style={styles.colHeaderImage} />
      <Text style={styles.colHeaderName}>Product</Text>
      <Text style={styles.colHeaderSku}>SKU</Text>
      <Text style={styles.colHeaderPrice}>Price</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------
export default function BookPdfDocument({
  title,
  subtitle,
  sections,
}: BookPdfProps) {
  return (
    <Document>
      {/* Cover Page */}
      <Page size="LETTER" style={{ padding: 0, backgroundColor: "#ffffff" }}>
        <View style={styles.coverPage}>
          <Text style={styles.coverTitle}>{title}</Text>
          {subtitle && <Text style={styles.coverSubtitle}>{subtitle}</Text>}
        </View>
      </Page>

      {/* Content pages — all sections flow continuously */}
      <Page size="LETTER" style={styles.page} wrap>
        {/* Repeat column headers at top of every page */}
        <ColumnHeaders />

        {sections.map((section) => {
          const productCount = section.items.filter(
            (i) => i.type === "product"
          ).length;

          return (
            <View key={section.id}>
              {/* Section heading */}
              <View style={styles.sectionHeader} wrap={false}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionProductCount}>
                  {productCount} product{productCount !== 1 ? "s" : ""}
                </Text>
              </View>

              {/* Items — 1-col rows or 2-col pairs */}
              {section.layout === "2-col" ? (
                buildPairs(section.items).map((row) =>
                  row.kind === "header" ? (
                    <HeaderBlock key={row.key} header={row.item} />
                  ) : (
                    <View key={row.key} style={styles.twoColPair} wrap={false}>
                      <ProductCell2Col product={row.left} />
                      <View style={styles.twoColSpacer} />
                      {row.right ? (
                        <ProductCell2Col product={row.right} />
                      ) : (
                        <View style={{ width: COL_WIDTH }} />
                      )}
                    </View>
                  )
                )
              ) : (
                section.items.map((item, idx) =>
                  item.type === "header" ? (
                    <HeaderBlock
                      key={`${section.id}-hdr-${idx}`}
                      header={item}
                    />
                  ) : (
                    <ProductRow
                      key={`${section.id}-prod-${item.product_cache_id}`}
                      product={item}
                    />
                  )
                )
              )}
            </View>
          );
        })}

        {/* Footer on every page */}
        <View style={styles.footer} fixed>
          <Text>{subtitle ? `${title} · ${subtitle}` : title}</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
            style={styles.pageNumber}
          />
        </View>
      </Page>
    </Document>
  );
}
