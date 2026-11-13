export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Platform {
  id: number;
  name: string;
  slug: string;
}

export interface Region {
  id: number;
  name: string;
  code: string;
}

export interface ProductImage {
  url: string;
  alt_text: string | null;
  is_primary: boolean;
}

export interface MarketplaceProduct {
  id: number;
  slug: string;
  title: string;
  short_description: string | null;
  description?: string;
  developer?: string | null;
  publisher?: string | null;
  release_date?: string | null;
  minimum_price?: string | null;
  currency?: string | null;
  images?: ProductImage[];
  platforms?: Array<{ id: number; name: string; slug: string }>;
  regions?: Region[];
  categories?: Category[];
  offers?: MarketplaceOffer[];
}

export interface ProductDetail extends MarketplaceProduct {
  description: string;
  offers: MarketplaceOffer[];
}

export interface MarketplaceOffer {
  id: number;
  price: string;
  compare_at_price: string | null;
  currency: string;
  available_stock?: number;
  seller: {
    id: number;
    name: string;
    slug: string;
  };
  platform?: {
    id: number;
    name: string;
    slug: string;
  };
  region?: {
    id: number;
    name: string;
    code: string;
  };
}

export interface BestSellerItem {
  product: MarketplaceProduct;
  units_sold: number;
}

export interface DealItem {
  product: MarketplaceProduct;
  offer: MarketplaceOffer;
}

export interface CuratedItem {
  product: MarketplaceProduct;
  offer: MarketplaceOffer | null;
}

export interface HomepageSection {
  key: string;
  title: string;
  type: "banner" | "best_sellers" | "deals" | "curated";
  items: Array<BestSellerItem | DealItem | CuratedItem>;
}

export interface HomepageResponse {
  sections: HomepageSection[];
}

export interface ProductsResponse {
  data: MarketplaceProduct[];
  meta?: { total: number; current_page?: number; last_page?: number };
}

export interface ProductPage {
  products: MarketplaceProduct[];
  total: number | null;
  currentPage: number;
  lastPage: number;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  platform?: string;
  region?: string;
  min_price?: string;
  max_price?: string;
  per_page?: number;
  sort?: string;
  page?: number;
}
