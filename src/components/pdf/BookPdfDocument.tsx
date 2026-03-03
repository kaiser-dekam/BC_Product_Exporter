import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  coverPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 60,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
    color: "#ffffff",
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "rgba(255,255,255,0.8)",
  },
  sectionDivider: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 60,
    backgroundColor: "#f8f9fa",
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  sectionProductCount: {
    fontSize: 12,
    textAlign: "center",
    color: "#666666",
  },
  productCard: {
    marginBottom: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
  },
  productHeader: {
    flexDirection: "row",
    marginBottom: 10,
  },
  productImage: {
    width: 80,
    height: 80,
    objectFit: "contain",
    marginRight: 15,
    borderRadius: 4,
    backgroundColor: "#f9fafb",
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  productSku: {
    fontSize: 9,
    color: "#6b7280",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563eb",
  },
  productSalePrice: {
    fontSize: 10,
    color: "#ef4444",
    textDecoration: "line-through",
    marginLeft: 6,
  },
  productSummary: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#374151",
    marginTop: 8,
    padding: 10,
    backgroundColor: "#f0f7ff",
    borderRadius: 4,
  },
  productSpecs: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  specItem: {
    fontSize: 8,
    color: "#6b7280",
    padding: "3 6",
    backgroundColor: "#f3f4f6",
    borderRadius: 3,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#9ca3af",
  },
  pageNumber: {
    fontSize: 8,
    color: "#9ca3af",
  },
});

// Types
interface BookProduct {
  product_cache_id: string;
  name: string;
  sku: string;
  price: number;
  primary_image_url: string;
  claude_summary: string | null;
  weight?: number;
  width?: number;
  height?: number;
  depth?: number;
}

interface BookSection {
  id: string;
  title: string;
  products: BookProduct[];
}

interface BookPdfProps {
  title: string;
  subtitle: string;
  coverColor: string;
  sections: BookSection[];
}

// Component
export default function BookPdfDocument({
  title,
  subtitle,
  coverColor,
  sections,
}: BookPdfProps) {
  return (
    <Document>
      {/* Cover Page */}
      <Page size="LETTER" style={[styles.page, { padding: 0 }]}>
        <View style={[styles.coverPage, { backgroundColor: coverColor }]}>
          <Text style={styles.coverTitle}>{title}</Text>
          {subtitle && <Text style={styles.coverSubtitle}>{subtitle}</Text>}
        </View>
      </Page>

      {/* Sections */}
      {sections.map((section) => (
        <Page key={section.id} size="LETTER" style={styles.page} wrap>
          {/* Section divider */}
          <View style={styles.sectionDivider} break>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionProductCount}>
              {section.products.length} product{section.products.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {/* Products */}
          {section.products.map((product) => (
            <View key={product.product_cache_id} style={styles.productCard} wrap={false}>
              <View style={styles.productHeader}>
                {product.primary_image_url ? (
                  <Image src={product.primary_image_url} style={styles.productImage} />
                ) : (
                  <View style={[styles.productImage, { justifyContent: "center", alignItems: "center" }]}>
                    <Text style={{ fontSize: 8, color: "#9ca3af" }}>No Image</Text>
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.sku && (
                    <Text style={styles.productSku}>SKU: {product.sku}</Text>
                  )}
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                  </View>
                </View>
              </View>

              {/* AI Summary */}
              {product.claude_summary && (
                <Text style={styles.productSummary}>{product.claude_summary}</Text>
              )}

              {/* Specs */}
              {(product.weight || product.width || product.height || product.depth) && (
                <View style={styles.productSpecs}>
                  {product.weight ? (
                    <Text style={styles.specItem}>Weight: {product.weight} lbs</Text>
                  ) : null}
                  {product.width && product.height && product.depth ? (
                    <Text style={styles.specItem}>
                      Dims: {product.width} x {product.height} x {product.depth} in
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text>{title}</Text>
            <Text
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
              style={styles.pageNumber}
            />
          </View>
        </Page>
      ))}
    </Document>
  );
}
