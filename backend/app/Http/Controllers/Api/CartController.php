<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\DigitalKey;
use App\Models\Offer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $cart = $this->cartFor($request)
            ->load(['items.offer.product.images', 'items.offer.platform', 'items.offer.region', 'items.offer.seller']);

        return response()->json(['data' => $this->serializeCart($cart)]);
    }

    public function add(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'offer_id' => ['required', 'integer', 'exists:offers,id'],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:99'],
        ]);
        $quantity = (int) ($validated['quantity'] ?? 1);

        $cart = DB::transaction(function () use ($request, $validated, $quantity): Cart {
            $cart = $this->lockedCartFor($request);
            $offer = $this->lockedOffer((int) $validated['offer_id']);
            $this->ensureOfferCanBePurchased($offer, $quantity);

            $item = $cart->items()->where('offer_id', $offer->id)->lockForUpdate()->first();
            $newQuantity = $quantity + ($item?->quantity ?? 0);
            $this->ensureOfferCanBePurchased($offer, $newQuantity);

            if ($item) {
                $item->update(['quantity' => $newQuantity]);
            } else {
                $cart->items()->create([
                    'offer_id' => $offer->id,
                    'quantity' => $quantity,
                ]);
            }

            return $cart;
        });

        return response()->json(['data' => $this->serializeCart($this->freshCart($cart))], 201);
    }

    public function update(Request $request, int $item): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        $cart = DB::transaction(function () use ($request, $item, $validated): Cart {
            $cart = $this->lockedCartFor($request);
            $cartItem = $cart->items()->whereKey($item)->lockForUpdate()->firstOrFail();
            $offer = $this->lockedOffer($cartItem->offer_id);
            $this->ensureOfferCanBePurchased($offer, (int) $validated['quantity']);

            $cartItem->update(['quantity' => (int) $validated['quantity']]);

            return $cart;
        });

        return response()->json(['data' => $this->serializeCart($this->freshCart($cart))]);
    }

    public function remove(Request $request, int $item): JsonResponse
    {
        $cart = DB::transaction(function () use ($request, $item): Cart {
            $cart = $this->lockedCartFor($request);
            $cartItem = $cart->items()->whereKey($item)->lockForUpdate()->firstOrFail();
            $cartItem->delete();

            return $cart;
        });

        return response()->json(['data' => $this->serializeCart($this->freshCart($cart))]);
    }

    private function cartFor(Request $request): Cart
    {
        return $request->user()->cart()->firstOrCreate([]);
    }

    private function lockedCartFor(Request $request): Cart
    {
        $cart = $request->user()->cart()->firstOrCreate([]);

        return Cart::query()->whereKey($cart->id)->lockForUpdate()->firstOrFail();
    }

    private function lockedOffer(int $offerId): Offer
    {
        return Offer::query()->whereKey($offerId)->lockForUpdate()->firstOrFail();
    }

    private function ensureOfferCanBePurchased(Offer $offer, int $quantity): void
    {
        if (! $offer->isActiveForPurchase()) {
            throw ValidationException::withMessages([
                'offer_id' => ['This offer is no longer available.'],
            ]);
        }

        $availableKeys = DigitalKey::query()
            ->where('offer_id', $offer->id)
            ->where('status', 'available')
            ->orderBy('id')
            ->limit($quantity)
            ->lockForUpdate()
            ->get(['id'])
            ->count();

        if ($availableKeys < $quantity) {
            throw ValidationException::withMessages([
                'quantity' => ['There is not enough stock available for this offer.'],
            ]);
        }
    }

    private function freshCart(Cart $cart): Cart
    {
        return Cart::query()
            ->whereKey($cart->id)
            ->with(['items.offer.product.images', 'items.offer.platform', 'items.offer.region', 'items.offer.seller'])
            ->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeCart(Cart $cart): array
    {
        $stockByOffer = DigitalKey::query()
            ->whereIn('offer_id', $cart->items->pluck('offer_id'))
            ->where('status', 'available')
            ->selectRaw('offer_id, COUNT(*) AS available_stock')
            ->groupBy('offer_id')
            ->pluck('available_stock', 'offer_id');

        $items = $cart->items->map(function (CartItem $item) use ($stockByOffer): array {
            $offer = $item->offer;
            $product = $offer->product;
            $image = $product->images->firstWhere('is_primary', true) ?? $product->images->first();
            $unitCents = $this->moneyToCents($offer->price);
            $availableStock = (int) ($stockByOffer[$offer->id] ?? 0);

            return [
                'id' => $item->id,
                'offer_id' => $offer->id,
                'quantity' => $item->quantity,
                'price' => number_format($unitCents / 100, 2, '.', ''),
                'currency' => $offer->currency,
                'subtotal' => number_format(($unitCents * $item->quantity) / 100, 2, '.', ''),
                'available_stock' => $availableStock,
                'is_available' => $offer->status === 'active'
                    && $product->status === 'active'
                    && $offer->seller->status === 'active'
                    && ($offer->starts_at === null || $offer->starts_at->isPast())
                    && ($offer->ends_at === null || $offer->ends_at->isFuture())
                    && $availableStock >= $item->quantity,
                'product' => [
                    'id' => $product->id,
                    'slug' => $product->slug,
                    'title' => $product->title,
                    'image' => $image ? [
                        'url' => $image->image_url,
                        'alt_text' => $image->alt_text,
                    ] : null,
                ],
                'platform' => [
                    'id' => $offer->platform->id,
                    'name' => $offer->platform->name,
                ],
                'region' => [
                    'id' => $offer->region->id,
                    'name' => $offer->region->name,
                    'code' => $offer->region->code,
                ],
                'seller' => [
                    'id' => $offer->seller->id,
                    'name' => $offer->seller->name,
                ],
            ];
        })->values();

        $totals = $items
            ->groupBy('currency')
            ->map(fn ($currencyItems, string $currency): array => [
                'currency' => $currency,
                'subtotal' => number_format(
                    $currencyItems->sum(fn (array $item): int => $this->moneyToCents($item['subtotal'])) / 100,
                    2,
                    '.',
                    '',
                ),
            ])
            ->values();

        return [
            'id' => $cart->id,
            'items' => $items,
            'item_count' => $items->sum('quantity'),
            'currency' => $totals->count() === 1 ? $totals->first()['currency'] : null,
            'subtotal' => match ($totals->count()) {
                0 => '0.00',
                1 => $totals->first()['subtotal'],
                default => null,
            },
            'totals_by_currency' => $totals,
        ];
    }

    private function moneyToCents(string|float|int $amount): int
    {
        return (int) round((float) $amount * 100);
    }
}
