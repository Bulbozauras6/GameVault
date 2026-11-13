<?php

namespace Tests\Feature;

use App\Models\DigitalKey;
use App\Models\Offer;
use App\Models\Order;
use App\Models\OrderItem;
use Database\Seeders\MarketplaceDemoSeeder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MarketplaceDemoSeederTest extends TestCase
{
    use DatabaseTransactions;

    public function test_demo_seeder_creates_ten_available_keys_per_offer_idempotently(): void
    {
        $seeder = app(MarketplaceDemoSeeder::class);
        $seeder->run();

        $offers = $this->activeDemoOffers();
        $this->assertCount(36, $offers);

        foreach ($offers as $offer) {
            $keys = $offer->digitalKeys()->where('status', 'available')->get();
            $this->assertCount(10, $keys);
            $this->assertCount(10, $keys->pluck('key_fingerprint')->unique());

            $key = $keys->firstOrFail();
            $plainKey = $key->encrypted_key;
            $this->assertStringStartsWith('GV-DEMO-'.$offer->id.'-', $plainKey);
            $this->assertSame(hash('sha256', $plainKey), $key->key_fingerprint);
            $this->assertNotSame(
                $plainKey,
                DB::table('digital_keys')->where('id', $key->id)->value('encrypted_key'),
            );
        }

        $firstSeedKeyCount = DigitalKey::query()->count();
        $seeder->run();
        $this->assertSame($firstSeedKeyCount, DigitalKey::query()->count());

        $offer = Offer::query()
            ->whereHas('product', fn ($query) => $query->where('slug', 'minecraft'))
            ->whereHas('orderItems')
            ->whereHas('seller', fn ($query) => $query->where('slug', 'vault-demo'))
            ->firstOrFail();
        $orderItem = OrderItem::query()->where('offer_id', $offer->id)->firstOrFail();
        $order = Order::query()->findOrFail($orderItem->order_id);
        $order->update(['subtotal' => '1.23', 'total' => '1.23']);
        $orderItem->update(['product_title_snapshot' => 'Preserved purchased title']);
        $assignedKey = $offer->digitalKeys()->where('status', 'available')->firstOrFail();
        $assignedKey->update([
            'status' => 'assigned',
            'order_item_id' => $orderItem->id,
            'assigned_at' => now(),
        ]);

        $seeder->run();

        $this->assertSame('assigned', $assignedKey->fresh()->status);
        $this->assertSame($orderItem->id, $assignedKey->fresh()->order_item_id);
        $this->assertSame('1.23', $order->fresh()->subtotal);
        $this->assertSame('Preserved purchased title', $orderItem->fresh()->product_title_snapshot);
        $this->assertSame(
            10,
            $offer->digitalKeys()->where('status', 'available')->count(),
        );
        $this->assertSame(11, $offer->digitalKeys()->count());
    }

    /**
     * @return Collection<int, Offer>
     */
    private function activeDemoOffers(): Collection
    {
        return Offer::query()
            ->where('status', 'active')
            ->whereHas('seller', fn ($query) => $query->whereIn('slug', [
                'vault-demo',
                'pixel-harbor-demo',
                'keynest-demo',
            ]))
            ->get();
    }
}
