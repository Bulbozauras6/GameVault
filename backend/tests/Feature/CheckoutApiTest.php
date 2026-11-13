<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\Category;
use App\Models\DigitalKey;
use App\Models\Offer;
use App\Models\Order;
use App\Models\Platform;
use App\Models\Product;
use App\Models\Region;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class CheckoutApiTest extends TestCase
{
    use DatabaseTransactions;

    public function test_guest_cannot_checkout(): void
    {
        $this->postJson('/api/checkout')->assertUnauthorized();
        $this->getJson('/api/orders')->assertUnauthorized();
        $this->getJson('/api/orders/1')->assertUnauthorized();
    }

    public function test_empty_cart_cannot_be_checked_out(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/checkout')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cart']);

        $this->assertDatabaseMissing('orders', ['user_id' => $user->id]);
    }

    public function test_checkout_uses_current_price_assigns_keys_and_clears_cart(): void
    {
        [$offer, , , , , $plainKeys] = $this->createOffer(stock: 2);
        [$secondOffer, , , , , $secondPlainKeys] = $this->createOffer(stock: 1);
        $user = User::factory()->create();
        $cart = $user->cart()->create();
        $cart->items()->create(['offer_id' => $offer->id, 'quantity' => 2]);
        $cart->items()->create(['offer_id' => $secondOffer->id, 'quantity' => 1]);
        $offer->update(['price' => '24.50']);

        $cartResponse = $this->actingAs($user)->getJson('/api/cart')->assertOk();
        $this->assertArrayNotHasKey('digital_keys', $cartResponse->json('data.items.0'));
        $this->assertArrayNotHasKey('key', $cartResponse->json('data.items.0'));

        $response = $this->actingAs($user)
            ->postJson('/api/checkout', [
                'total' => '0.00',
                'items' => [['offer_id' => $offer->id, 'price' => '0.00']],
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.currency', 'USD')
            ->assertJsonPath('data.subtotal', '68.99')
            ->assertJsonPath('data.total', '68.99')
            ->assertJsonCount(2, 'data.items')
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.unit_price', '24.50')
            ->assertJsonPath('data.items.0.line_total', '49.00')
            ->assertJsonCount(2, 'data.items.0.digital_keys')
            ->assertJsonPath('data.items.1.offer_id', $secondOffer->id)
            ->assertJsonCount(1, 'data.items.1.digital_keys');

        $order = $response->json('data');
        $this->assertSame('Demo Game', $order['items'][0]['product_title']);
        $this->assertSame('Demo Seller', $order['items'][0]['seller_name']);
        $this->assertSame($plainKeys[0], $order['items'][0]['digital_keys'][0]['key']);
        $this->assertSame($secondPlainKeys[0], $order['items'][1]['digital_keys'][0]['key']);
        $this->assertArrayNotHasKey('encrypted_key', $order['items'][0]['digital_keys'][0]);
        $this->assertArrayNotHasKey('key_fingerprint', $order['items'][0]['digital_keys'][0]);

        $this->assertDatabaseHas('orders', [
            'id' => $order['id'],
            'user_id' => $user->id,
            'status' => 'completed',
            'subtotal' => '68.99',
            'total' => '68.99',
        ]);
        $this->assertDatabaseHas('order_items', [
            'order_id' => $order['id'],
            'offer_id' => $offer->id,
            'quantity' => 2,
            'unit_price' => '24.50',
            'line_total' => '49.00',
            'product_title_snapshot' => 'Demo Game',
            'seller_name_snapshot' => 'Demo Seller',
        ]);
        $this->assertSame(0, $cart->items()->count());
        $this->assertSame(
            3,
            DigitalKey::query()->whereIn('offer_id', [$offer->id, $secondOffer->id])->where('status', 'assigned')->count(),
        );
        $this->assertNotSame(
            $plainKeys[0],
            DB::table('digital_keys')->where('offer_id', $offer->id)->orderBy('id')->value('encrypted_key'),
        );

        $this->assertCount(0, $this->getJson('/api/cart')->assertOk()->json('data.items'));
    }

    public function test_insufficient_stock_rolls_back_order_key_assignment_and_cart_changes(): void
    {
        [$firstOffer, , , , , $firstKeyValues] = $this->createOffer(stock: 1);
        [$secondOffer] = $this->createOffer(stock: 0);
        $user = User::factory()->create();
        $cart = $user->cart()->create();
        $firstItem = $cart->items()->create(['offer_id' => $firstOffer->id, 'quantity' => 1]);
        $secondItem = $cart->items()->create(['offer_id' => $secondOffer->id, 'quantity' => 1]);

        $this->actingAs($user)
            ->postJson('/api/checkout')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items.'.$secondItem->id]);

        $this->assertDatabaseMissing('orders', ['user_id' => $user->id]);
        $this->assertDatabaseHas('cart_items', ['id' => $firstItem->id, 'cart_id' => $cart->id]);
        $this->assertDatabaseHas('cart_items', ['id' => $secondItem->id, 'cart_id' => $cart->id]);
        $this->assertDatabaseHas('digital_keys', [
            'offer_id' => $firstOffer->id,
            'key_fingerprint' => hash('sha256', $firstKeyValues[0]),
            'status' => 'available',
            'order_item_id' => null,
        ]);
    }

    public function test_mixed_currency_cart_is_rejected_without_creating_an_order(): void
    {
        [$firstOffer] = $this->createOffer(stock: 1);
        [$secondOffer] = $this->createOffer(stock: 1);
        $secondOffer->update(['currency' => 'EUR']);
        $user = User::factory()->create();
        $cart = $user->cart()->create();
        $cart->items()->create(['offer_id' => $firstOffer->id, 'quantity' => 1]);
        $cart->items()->create(['offer_id' => $secondOffer->id, 'quantity' => 1]);

        $this->actingAs($user)
            ->postJson('/api/checkout')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cart']);

        $this->assertDatabaseMissing('orders', ['user_id' => $user->id]);
        $this->assertSame(2, $cart->items()->count());
    }

    public function test_one_available_key_cannot_be_assigned_to_two_users(): void
    {
        [$offer, , , , , $plainKeys] = $this->createOffer(stock: 1);
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();

        foreach ([$firstUser, $secondUser] as $user) {
            $user->cart()->create()->items()->create([
                'offer_id' => $offer->id,
                'quantity' => 1,
            ]);
        }

        $firstResponse = $this->actingAs($firstUser)->postJson('/api/checkout')->assertCreated();
        $this->actingAs($secondUser)
            ->postJson('/api/checkout')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items.'.Cart::query()->where('user_id', $secondUser->id)->firstOrFail()->items()->firstOrFail()->id]);

        $this->assertSame(1, Order::query()->where('user_id', $firstUser->id)->count());
        $this->assertSame(0, Order::query()->where('user_id', $secondUser->id)->count());
        $this->assertSame($plainKeys[0], $firstResponse->json('data.items.0.digital_keys.0.key'));
        $this->assertSame(
            'assigned',
            DigitalKey::query()->where('offer_id', $offer->id)->firstOrFail()->status,
        );
    }

    public function test_users_cannot_read_another_users_order_or_digital_keys(): void
    {
        [$offer] = $this->createOffer(stock: 1);
        $owner = User::factory()->create();
        $owner->cart()->create()->items()->create(['offer_id' => $offer->id, 'quantity' => 1]);
        $orderId = $this->actingAs($owner)
            ->postJson('/api/checkout')
            ->assertCreated()
            ->json('data.id');
        $otherUser = User::factory()->create();

        $this->actingAs($otherUser)
            ->getJson('/api/orders/'.$orderId)
            ->assertNotFound();

        $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->actingAs($owner)
            ->getJson('/api/orders/'.$orderId)
            ->assertOk()
            ->assertJsonCount(1, 'data.items.0.digital_keys');

        $this->getJson('/api/orders')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.item_count', 1);
    }

    /**
     * @return array{Offer, Product, Seller, Platform, Region, list<string>}
     */
    private function createOffer(int $stock): array
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
            'name' => 'Demo Seller',
            'slug' => 'demo-seller-'.$suffix,
            'status' => 'active',
        ]);
        $product = Product::query()->create([
            'slug' => 'demo-game-'.$suffix,
            'title' => 'Demo Game',
            'short_description' => 'A demo game.',
            'description' => 'Checkout test product.',
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
            'price' => '19.99',
            'compare_at_price' => '29.99',
            'currency' => 'USD',
            'status' => 'active',
        ]);

        $keys = [];

        for ($index = 0; $index < $stock; $index++) {
            $key = 'checkout-test-'.$suffix.'-'.$index;
            $keys[] = $key;
            DigitalKey::query()->create([
                'offer_id' => $offer->id,
                'encrypted_key' => $key,
                'key_fingerprint' => hash('sha256', $key),
                'status' => 'available',
            ]);
        }

        return [$offer, $product, $seller, $platform, $region, $keys];
    }
}
