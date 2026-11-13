import api from "./client";
import type { Category, HomepageResponse, MarketplaceProduct, Platform, ProductDetail, ProductFilters, ProductPage, ProductsResponse, Region } from "./types";

export async function fetchHomepage(): Promise<HomepageResponse> {
  const response = await api.get<{ data: HomepageResponse }>("/api/home");
  return response.data.data;
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await api.get<{ data: Category[] }>("/api/categories");
  return response.data.data;
}

export async function fetchPlatforms(): Promise<Platform[]> {
  const response = await api.get<{ data: Platform[] }>("/api/platforms");
  return response.data.data;
}

export async function fetchRegions(): Promise<Region[]> {
  const response = await api.get<{ data: Region[] }>("/api/regions");
  return response.data.data;
}

export async function fetchProducts(filters: ProductFilters = {}): Promise<MarketplaceProduct[]> {
  const result = await fetchProductPage(filters);
  return result.products;
}

export async function fetchProductPage(filters: ProductFilters = {}): Promise<ProductPage> {
  const response = await api.get<ProductsResponse>("/api/products", {
    params: { per_page: 6, ...filters },
  });
  return {
    products: response.data.data,
    total: response.data.meta?.total ?? null,
    currentPage: response.data.meta?.current_page ?? 1,
    lastPage: response.data.meta?.last_page ?? 1,
  };
}

export async function fetchProduct(slug: string): Promise<ProductDetail> {
  const response = await api.get<{ data: ProductDetail }>(`/api/products/${encodeURIComponent(slug)}`);
  return response.data.data;
}
