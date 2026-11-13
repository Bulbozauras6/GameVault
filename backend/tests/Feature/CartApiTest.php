<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\Category;
use App\Models\DigitalKey;
use App\Models\Offer;
use App\Models\Platform;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\Region;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class CartApiTest extends TestCase
{
    use DatabaseTransactions;

    public function test_guest_cannot_retrieve_or_modify_a_cart(): void
    {
        $this->getJson('/api/cart')->assertUnauthorized();
        $this->postJson('/api/cart/items', ['offer_id' => 1])->assertUnauthorized();
    }

    public function test_authenticated_user_gets_an_empty_persistent_cart(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/cart')
            ->assertOk()
            ->assertJsonPath('data.item_count', 0)
            ->assertJsonPath('data.subtotal', '0.00')
            ->assertJsonCount(0, 'data.items');

        $this->assertDatabaseHas('carts', ['user_id' => $user->id]);
    }

    public function test_user_can_add_an_offer_and_change_quantity_using_current_price(): void
    {
        [$offer, $product, $seller, $platform, $region] = $this->createOffer(stock: 4);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/cart/items', ['offer_id' => $offer->id])
            ->assertCreated()
            ->assertJsonPath('data.item_count', 1)
            ->assertJsonPath('data.items.0.product.title', $product->title)
            ->assertJsonPath('data.items.0.product.image.alt_text', 'Demo cover')
            ->assertJsonPath('data.items.0.seller.name', $seller->name)
            ->assertJsonPath('data.items.0.platform.name', $platform->name)
            ->assertJsonPath('data.items.0.region.name', $region->name)
            ->assertJsonPath('data.items.0.price', '19.99')
            ->assertJsonPath('data.items.0.subtotal', '19.99');

        $itemId = Cart::query()->where('user_id', $user->id)->firstOrFail()->items()->firstOrFail()->id;

        $this->postJson('/api/cart/items', ['offer_id' => $offer->id, 'quantity' => 1])
            ->assertCreated()
            ->assertJsonPath('data.item_count', 2)
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.subtotal', '39.98');

        $offer->update(['price' => '24.50']);
        $this->putJson('/api/cart/items/'.$itemId, ['quantity' => 4])
            ->assertOk()
            ->assertJsonPath('data.items.0.quantity', 4)
            ->assertJsonPath('data.items.0.price', '24.50')
            ->assertJsonPath('data.items.0.subtotal', '98.00')
            ->assertJsonPath('data.subtotal', '98.00');

        $this->putJson('/api/cart/items/'.$itemId, ['quantity' => 2])
            ->assertOk()
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.subtotal', '49.00');
    }

    public function test_user_can_add_products_from_different_offers_to_the_same_cart(): void
    {
        [$firstOffer, $firstProduct] = $this->createOffer(stock: 1);
        [$secondOffer, $secondProduct] = $this->createOffer(stock: 1);
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/cart/items', ['offer_id' => $firstOffer->id])
            ->assertCreated()
            ->assertJsonPath('data.item_count', 1);

        $this->postJson('/api/cart/items', ['offer_id' => $secondOffer->id])
            ->assertCreated()
            ->assertJsonPath('data.item_count', 2)
            ->assertJsonCount(2, 'data.items')
            ->assertJsonFragment(['title' => $firstProduct->title])
            ->assertJsonFragment(['title' => $secondProduct->title]);
    }

    public function test_user_can_remove_a_cart_item(): void
    {
        [$offer] = $this->createOffer(stock: 2);
        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/cart/items', ['offer_id' => $offer->id])->assertCreated();
        $itemId = Cart::query()->where('user_id', $user->id)->firstOrFail()->items()->firstOrFail()->id;

        $this->deleteJson('/api/cart/items/'.$itemId)
            ->assertOk()
            ->assertJsonPath('data.item_count', 0)
            ->assertJsonCount(0, 'data.items');

        $this->assertDatabaseMissing('cart_items', ['id' => $itemId]);
    }

    public function test_cart_items_are_scoped_to_the_authenticated_users_cart(): void
    {
        [$offer] = $this->createOffer(stock: 2);
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $ownerCart = $owner->cart()->create();
        $item = $ownerCart->items()->create(['offer_id' => $offer->id, 'quantity' => 1]);

        $this->actingAs($otherUser)
            ->putJson('/api/cart/items/'.$item->id, ['quantity' => 2])
            ->assertNotFound();

        $this->deleteJson('/api/cart/items/'.$item->id)->assertNotFound();
        $this->assertDatabaseHas('cart_items', ['id' => $item->id, 'quantity' => 1]);
    }

    public function test_inactive_product_seller_or_offer_is_rejected(): void
    {
        foreach (['offer', 'product', 'seller'] as $inactiveTarget) {
            [$offer, $product, $seller] = $this->createOffer(stock: 2);

            match ($inactiveTarget) {
                'offer' => $offer->update(['status' => 'inactive']),
                'product' => $product->update(['status' => 'inactive']),
                'seller' => $seller->update(['status' => 'inactive']),
            };

            $user = User::factory()->create();
            $this->actingAs($user)
                ->postJson('/api/cart/items', ['offer_id' => $offer->id])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['offer_id']);
        }
    }

    public function test_insufficient_stock_and_invalid_quantities_are_rejected(): void
    {
        [$offer] = $this->createOffer(stock: 1);
        $user = User::factory()->create();
        $this->actingAs($user)
            ->postJson('/api/cart/items', ['offer_id' => $offer->id, 'quantity' => 2])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity']);

        $this->postJson('/api/cart/items', ['offer_id' => $offer->id, 'quantity' => 0])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity']);

        $this->postJson('/api/cart/items', ['offer_id' => $offer->id])->assertCreated();

        $itemId = Cart::query()->where('user_id', $user->id)->firstOrFail()->items()->firstOrFail()->id;
        $this->postJson('/api/cart/items', ['offer_id' => $offer->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity']);
        $this->putJson('/api/cart/items/'.$itemId, ['quantity' => 2])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['quantity']);
    }

    /**
     * @return array{Offer, Product, Seller, Platform, Region}
     */
    private function createOffer(int $stock = 0): array
    {
        $suffix = Str::uuid()->toString();
        $category = Category::query()->create([
            'name' => 'Action '.$suffix,
            'slug' => 'action-'.$suffix,
            'is_active' => true,
        ]);
        $platform = Platform::query()->create(['name' => 'PC '.$suffix, 'slug' => 'pc-'.$suffix]);
        $region = Region::query()->create(['name' => 'Global '.$suffix, 'code' => Str::upper(Str::random(12))]);
        $seller = Seller::query()->create([
            'name' => 'Seller '.$suffix,
            'slug' => 'seller-'.$suffix,
            'status' => 'active',
        ]);
        $product = Product::query()->create([
            'slug' => 'game-'.$suffix,
            'title' => 'Game '.$suffix,
            'short_description' => 'A demo product.',
            'description' => 'Game description.',
            'status' => 'active',
        ]);
        $product->categories()->attach($category);
        $product->platforms()->attach($platform);
        $product->regions()->attach($region);

        ProductImage::query()->create([
            'product_id' => $product->id,
            'image_url' => 'https://example.test/'.$suffix.'.jpg',
            'alt_text' => 'Demo cover',
            'sort_order' => 0,
            'is_primary' => true,
        ]);

        $offer = Offer::query()->create([
            'product_id' => $product->id,
            'seller_id' => $seller->id,
            'platform_id' => $platform->id,
            'region_id' => $region->id,
            'price' => '19.99',
            'compare_at_price' => '29.99',
            'currency' => 'USD',
            'status' => 'active',
        ]);

        for ($index = 0; $index < $stock; $index++) {
            $key = 'test-key-'.$suffix.'-'.$index;
            DigitalKey::query()->create([
                'offer_id' => $offer->id,
                'encrypted_key' => $key,
                'key_fingerprint' => hash('sha256', $key),
                'status' => 'available',
            ]);
        }

        return [$offer, $product, $seller, $platform, $region];
    }
}
