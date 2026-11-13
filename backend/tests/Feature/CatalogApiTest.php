<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\DigitalKey;
use App\Models\HomepageSection;
use App\Models\HomepageSectionItem;
use App\Models\Offer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Platform;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Region;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

class CatalogApiTest extends TestCase
{
    use DatabaseTransactions;

    public function test_lookup_endpoints_return_only_values_used_by_active_products(): void
    {
        [$product, $category, $platform, $region] = $this->createCatalogueProduct();
        $inactiveCategory = Category::query()->create([
            'name' => 'Retired',
            'slug' => 'retired-'.Str::uuid(),
            'is_active' => true,
        ]);
        $inactiveProduct = Product::query()->create([
            'slug' => 'inactive-'.Str::uuid(),
            'title' => 'Inactive game',
            'description' => 'Not visible.',
            'status' => 'inactive',
        ]);
        $inactiveCategory->products()->attach($inactiveProduct);

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonPath('data.0.slug', $category->slug)
            ->assertJsonMissing(['slug' => $inactiveCategory->slug]);

        $this->getJson('/api/platforms')
            ->assertOk()
            ->assertJsonFragment(['slug' => $platform->slug]);

        $this->getJson('/api/regions')
            ->assertOk()
            ->assertJsonFragment(['code' => $region->code]);

        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_product_index_paginates_and_returns_consistent_product_data(): void
    {
        [$first] = $this->createCatalogueProduct('Alpha Game');
        $this->createCatalogueProduct('Beta Game');

        $response = $this->getJson('/api/products?per_page=1&page=1&sort=title_asc')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'slug', 'title', 'minimum_price', 'images']],
                'links' => ['first', 'last', 'prev', 'next'],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ])
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.currency', 'USD');

        $this->assertSame($first->title, $response->json('data.0.title'));
    }

    public function test_product_index_filters_by_category_platform_region_and_price(): void
    {
        [$matching, $category, $platform, $region] = $this->createCatalogueProduct('Filtered Game', '25.00');
        $this->createCatalogueProduct('Too Cheap', '10.00');

        $response = $this->getJson('/api/products?category='.$category->slug.'&platform='.$platform->slug.'&region='.$region->code.'&min_price=20&max_price=30')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);

        $this->assertSame($matching->slug, $response->json('data.0.slug'));
    }

    public function test_product_index_supports_partial_and_typo_tolerant_search(): void
    {
        [$product] = $this->createCatalogueProduct('Stardew Valley');
        $this->createCatalogueProduct('Hollow Knight');

        $this->getJson('/api/products?search=dew')
            ->assertOk()
            ->assertJsonPath('data.0.slug', $product->slug);

        $this->getJson('/api/products?search=Stardew Vally')
            ->assertOk()
            ->assertJsonPath('data.0.slug', $product->slug);
    }

    public function test_product_index_sorts_by_cheapest_active_offer(): void
    {
        [$expensive] = $this->createCatalogueProduct('Expensive Game', '50.00');
        [$cheap] = $this->createCatalogueProduct('Cheap Game', '10.00');

        $this->getJson('/api/products?sort=price_asc')
            ->assertOk()
            ->assertJsonPath('data.0.slug', $cheap->slug)
            ->assertJsonPath('data.1.slug', $expensive->slug);
    }

    public function test_product_index_rejects_invalid_query_parameters(): void
    {
        $this->getJson('/api/products?sort=unknown')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sort']);

        $this->getJson('/api/products?per_page=100')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['per_page']);

        $this->getJson('/api/products?min_price=20&max_price=10')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['max_price']);

        $this->getJson('/api/products?category=does-not-exist')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category']);
    }

    public function test_product_detail_contains_supported_metadata_and_only_active_offers(): void
    {
        [$product, $category, $platform, $region, $seller, $offer] = $this->createCatalogueProduct('Details Game');
        ProductImage::query()->create([
            'product_id' => $product->id,
            'image_url' => 'https://example.test/game.webp',
            'alt_text' => 'Game cover',
            'sort_order' => 0,
            'is_primary' => true,
        ]);
        Offer::query()->create([
            'product_id' => $product->id,
            'seller_id' => $seller->id,
            'platform_id' => $platform->id,
            'region_id' => $region->id,
            'price' => '5.00',
            'currency' => 'USD',
            'status' => 'inactive',
        ]);
        DigitalKey::query()->create([
            'offer_id' => $offer->id,
            'encrypted_key' => 'fictional-secret',
            'key_fingerprint' => hash('sha256', 'fictional-secret'),
            'status' => 'available',
        ]);

        $response = $this->getJson('/api/products/'.$product->slug)
            ->assertOk()
            ->assertJsonPath('data.description', 'Details for Details Game.')
            ->assertJsonPath('data.images.0.url', 'https://example.test/game.webp')
            ->assertJsonPath('data.categories.0.slug', $category->slug)
            ->assertJsonPath('data.platforms.0.slug', $platform->slug)
            ->assertJsonPath('data.regions.0.code', $region->code)
            ->assertJsonPath('data.offers.0.id', $offer->id)
            ->assertJsonPath('data.offers.0.available_stock', 1)
            ->assertJsonCount(1, 'data.offers');

        $this->assertStringNotContainsString('fictional-secret', $response->getContent());
        $this->getJson('/api/products/missing-product')->assertNotFound();
    }

    public function test_home_returns_database_driven_sections_and_recent_best_sellers(): void
    {
        [$bestSeller] = $this->createCatalogueProduct('Recent Hit');
        [$olderHit] = $this->createCatalogueProduct('Old Hit');
        [$dealProduct, , , , , $dealOffer] = $this->createCatalogueProduct('Deal Game', '15.00', '30.00');

        $this->createCompletedOrder($bestSeller, 3, Carbon::now()->subDays(5));
        $this->createCompletedOrder($olderHit, 9, Carbon::now()->subDays(31));

        $banner = HomepageSection::query()->create([
            'section_key' => 'main-banner-'.Str::uuid(),
            'title' => 'Featured',
            'section_type' => 'banner',
            'is_active' => true,
            'sort_order' => 1,
        ]);
        HomepageSectionItem::query()->create([
            'section_id' => $banner->id,
            'product_id' => $dealProduct->id,
            'sort_order' => 1,
        ]);

        HomepageSection::query()->create([
            'section_key' => 'best-sellers-'.Str::uuid(),
            'title' => 'Best Sellers',
            'section_type' => 'best_sellers',
            'is_active' => true,
            'sort_order' => 2,
            'settings' => ['limit' => 5],
        ]);
        HomepageSection::query()->create([
            'section_key' => 'deals-'.Str::uuid(),
            'title' => 'Deals',
            'section_type' => 'deals',
            'is_active' => true,
            'sort_order' => 3,
        ]);
        $inactiveSectionKey = 'hidden-'.Str::uuid();
        HomepageSection::query()->create([
            'section_key' => $inactiveSectionKey,
            'title' => 'Inactive section',
            'section_type' => 'curated',
            'is_active' => false,
            'sort_order' => 4,
        ]);

        $response = $this->getJson('/api/home')->assertOk();
        $sections = collect($response->json('data.sections'));

        $bestSellers = $sections->firstWhere('type', 'best_sellers');
        $this->assertSame($bestSeller->slug, $bestSellers['items'][0]['product']['slug']);
        $this->assertSame(3, $bestSellers['items'][0]['units_sold']);
        $this->assertNotContains($olderHit->slug, collect($bestSellers['items'])->pluck('product.slug'));
        $this->assertSame($dealOffer->id, $sections->firstWhere('type', 'deals')['items'][0]['offer']['id']);
        $this->assertNotContains($inactiveSectionKey, $sections->pluck('key'));
    }

    /**
     * @return array{Product, Category, Platform, Region, Seller, Offer}
     */
    private function createCatalogueProduct(
        string $title = 'Demo Game',
        string $price = '20.00',
        ?string $compareAtPrice = null,
    ): array {
        $suffix = (string) Str::uuid();
        $category = Category::query()->create([
            'name' => 'Action '.$suffix,
            'slug' => 'action-'.$suffix,
            'is_active' => true,
        ]);
        $platform = Platform::query()->create([
            'name' => 'PC '.$suffix,
            'slug' => 'pc-'.$suffix,
        ]);
        $region = Region::query()->create([
            'name' => 'Global '.$suffix,
            'code' => 'G'.strtoupper(substr(str_replace('-', '', $suffix), 0, 7)),
        ]);
        $seller = Seller::query()->create([
            'name' => 'Seller '.$suffix,
            'slug' => 'seller-'.$suffix,
            'status' => 'active',
        ]);
        $product = Product::query()->create([
            'slug' => Str::slug($title).'-'.$suffix,
            'title' => $title,
            'short_description' => 'Short description.',
            'description' => "Details for {$title}.",
            'developer' => 'GameVault Studio',
            'publisher' => 'GameVault Publishing',
            'release_date' => '2025-01-01',
            'status' => 'active',
        ]);
        $product->categories()->attach($category);
        $product->platforms()->attach($platform);
        $product->regions()->attach($region);

        $offer = Offer::query()->create([
            'product_id' => $product->id,
            'seller_id' => $seller->id,
            'platform_id' => $platform->id,
            'region_id' => $region->id,
            'price' => $price,
            'compare_at_price' => $compareAtPrice,
            'currency' => 'USD',
            'status' => 'active',
        ]);

        return [$product, $category, $platform, $region, $seller, $offer];
    }

    private function createCompletedOrder(Product $product, int $quantity, Carbon $placedAt): void
    {
        $offer = $product->offers()->firstOrFail();
        $order = Order::query()->create([
            'order_number' => Str::uuid(),
            'user_id' => User::factory()->create()->id,
            'status' => 'completed',
            'payment_method' => 'simulated',
            'payment_reference' => Str::uuid(),
            'currency' => 'USD',
            'subtotal' => $offer->price * $quantity,
            'total' => $offer->price * $quantity,
            'placed_at' => $placedAt,
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'offer_id' => $offer->id,
            'product_id' => $product->id,
            'seller_id' => $offer->seller_id,
            'quantity' => $quantity,
            'unit_price' => $offer->price,
            'line_total' => $offer->price * $quantity,
            'currency' => 'USD',
            'product_title_snapshot' => $product->title,
            'seller_name_snapshot' => $offer->seller->name,
            'platform_name_snapshot' => $offer->platform->name,
            'region_name_snapshot' => $offer->region->name,
        ]);
    }
}
