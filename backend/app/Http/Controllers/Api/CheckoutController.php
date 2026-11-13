<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\CartItem;
use App\Models\DigitalKey;
use App\Models\Offer;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CheckoutController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $orderId = DB::transaction(function () use ($user): int {
            $cart = $user->cart()->lockForUpdate()->first();

            if (! $cart) {
                throw ValidationException::withMessages([
                    'cart' => ['Your cart is empty.'],
                ]);
            }

            $cartItems = $cart->items()
                ->orderBy('offer_id')
                ->lockForUpdate()
                ->get();

            if ($cartItems->isEmpty()) {
                throw ValidationException::withMessages([
                    'cart' => ['Your cart is empty.'],
                ]);
            }

            $offerIds = $cartItems->pluck('offer_id')->unique()->sort()->values();
            $offers = Offer::query()
                ->with(['product', 'seller', 'platform', 'region'])
                ->whereIn('id', $offerIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($offers->count() !== $offerIds->count()) {
                throw ValidationException::withMessages([
                    'cart' => ['An offer in your cart is no longer available.'],
                ]);
            }

            $lines = [];
            $currency = null;
            $subtotalCents = 0;

            foreach ($cartItems as $cartItem) {
                $offer = $offers->get($cartItem->offer_id);

                if (! $offer instanceof Offer || ! $offer->isActiveForPurchase()) {
                    throw ValidationException::withMessages([
                        'items.'.$cartItem->id => ['An offer in your cart is no longer available.'],
                    ]);
                }

                if ($currency !== null && $currency !== $offer->currency) {
                    throw ValidationException::withMessages([
                        'cart' => ['All items must use the same currency to complete one order.'],
                    ]);
                }

                $currency = $offer->currency;
                $unitPriceCents = $this->moneyToCents($offer->price);
                $lineTotalCents = $unitPriceCents * $cartItem->quantity;
                $availableKeys = DigitalKey::query()
                    ->where('offer_id', $offer->id)
                    ->where('status', 'available')
                    ->orderBy('id')
                    ->limit($cartItem->quantity)
                    ->lockForUpdate()
                    ->get(['id']);

                if ($availableKeys->count() !== $cartItem->quantity) {
                    throw ValidationException::withMessages([
                        'items.'.$cartItem->id => ['There is not enough stock available for this offer.'],
                    ]);
                }

                $lines[] = [
                    'cart_item' => $cartItem,
                    'offer' => $offer,
                    'unit_price_cents' => $unitPriceCents,
                    'line_total_cents' => $lineTotalCents,
                    'keys' => $availableKeys,
                ];
                $subtotalCents += $lineTotalCents;
            }

            $placedAt = now();
            $order = Order::query()->create([
                'order_number' => (string) Str::uuid(),
                'user_id' => $user->id,
                'status' => 'completed',
                'payment_method' => 'simulated',
                'payment_reference' => (string) Str::uuid(),
                'currency' => $currency,
                'subtotal' => $this->formatCents($subtotalCents),
                'total' => $this->formatCents($subtotalCents),
                'placed_at' => $placedAt,
            ]);

            foreach ($lines as $line) {
                /** @var CartItem $cartItem */
                $cartItem = $line['cart_item'];
                /** @var Offer $offer */
                $offer = $line['offer'];
                /** @var Collection<int, DigitalKey> $keys */
                $keys = $line['keys'];
                $orderItem = OrderItem::query()->create([
                    'order_id' => $order->id,
                    'offer_id' => $offer->id,
                    'product_id' => $offer->product_id,
                    'seller_id' => $offer->seller_id,
                    'quantity' => $cartItem->quantity,
                    'unit_price' => $this->formatCents($line['unit_price_cents']),
                    'line_total' => $this->formatCents($line['line_total_cents']),
                    'currency' => $offer->currency,
                    'product_title_snapshot' => $offer->product->title,
                    'seller_name_snapshot' => $offer->seller->name,
                    'platform_name_snapshot' => $offer->platform->name,
                    'region_name_snapshot' => $offer->region->name,
                ]);

                $updatedKeys = DigitalKey::query()
                    ->whereIn('id', $keys->modelKeys())
                    ->where('offer_id', $offer->id)
                    ->where('status', 'available')
                    ->update([
                        'status' => 'assigned',
                        'order_item_id' => $orderItem->id,
                        'assigned_at' => $placedAt,
                    ]);

                if ($updatedKeys !== $cartItem->quantity) {
                    throw ValidationException::withMessages([
                        'cart' => ['Inventory changed during checkout. Please try again.'],
                    ]);
                }
            }

            $cart->items()->delete();

            return $order->id;
        }, attempts: 3);

        $order = Order::query()
            ->where('user_id', $user->id)
            ->with(['items.digitalKeys' => fn ($query) => $query->where('status', 'assigned')])
            ->findOrFail($orderId);

        return (new OrderResource($order))->response()->setStatusCode(201);
    }

    private function moneyToCents(string $amount): int
    {
        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '0');

        return ((int) $whole * 100) + (int) str_pad(substr($fraction, 0, 2), 2, '0');
    }

    private function formatCents(int $amount): string
    {
        return intdiv($amount, 100).'.'.str_pad((string) ($amount % 100), 2, '0', STR_PAD_LEFT);
    }
}
