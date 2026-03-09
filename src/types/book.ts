export interface Book {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: "draft" | "published";
  cover_config: {
    background_color: string;
    title_font_size: number;
    subtitle: string;
    logo_url: string | null;
  };
  created_at: string;
  updated_at: string;
  page_count: number;
}

export type PageType = "cover" | "section_divider" | "product_page" | "blank";

export interface BookPage {
  id: string;
  book_id: string;
  type: PageType;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  divider_config: {
    heading: string;
    subheading: string;
    background_color: string;
  } | null;
}

export interface BookSection {
  id: string;
  page_id: string;
  book_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BookProduct {
  id: string;
  section_id: string;
  page_id: string;
  book_id: string;
  product_cache_id: string;
  bigcommerce_product_id: number;
  sort_order: number;
  override_name: string | null;
  override_price: number | null;
  override_specs: string | null;
  override_weight_dims: string | null;
  show_in_book: boolean;
  created_at: string;
  updated_at: string;
}
