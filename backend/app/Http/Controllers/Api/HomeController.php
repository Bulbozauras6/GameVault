<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OfferResource;
use App\Http\Resources\ProductResource;
use App\Models\BestSellingProduct;
use App\Models\HomepageSection;
use App\Models\Offer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class HomeController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $sections = HomepageSection::query()
            ->where('is_active', true)
            ->where(fn (Builder $query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn (Builder $query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', now()))
            ->orderBy('sort_order')
            ->get();

        $data = $sections->map(fn (HomepageSection $section): array => [
            'key' => $section->section_key,
            'title' => $section->title,
            'type' => $section->section_type,
            'items' => $this->sectionItems($section),
        ]);

        return response()->json(['data' => ['sections' => $data]]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function sectionItems(HomepageSection $section): array
    {
        $limit = max(1, min((int) ($section->settings['limit'] ?? 8), 24));

        return match ($section->section_type) {
            'best_sellers' => $this->bestSellers($limit),
            'deals' => $this->deals($limit),
            'banner', 'curated' => $this->curatedItems($section, $limit),
            default => [],
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function bestSellers(int $limit): array
    {
        $summaries = BestSellingProduct::query()
            ->whereHas('product', fn (Builder $products) => $products->where('status', 'active'))
            ->with([
                'product' => fn ($products) => $products
                    ->where('status', 'active')
                    ->with(['images' => fn ($images) => $images->orderBy('sort_order')])
                    ->withMin(['offers as minimum_price' => fn (Builder $offers) => $this->activeOffers($offers)], 'price'),
            ])
            ->orderByDesc('units_sold')
            ->limit($limit)
            ->get();

        return $summaries->map(fn (BestSellingProduct $summary): array => [
            'product' => (new ProductResource($summary->product))->resolve(),
            'units_sold' => $summary->units_sold,
        ])->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function deals(int $limit): array
    {
        return Offer::query()
            ->where('status', 'active')
            ->whereNotNull('compare_at_price')
            ->whereColumn('compare_at_price', '>', 'price')
            ->whereHas('product', fn (Builder $products) => $products->where('status', 'active'))
            ->with([
                'seller',
                'platform',
                'region',
                'product' => fn ($products) => $products
                    ->where('status', 'active')
                    ->with(['images' => fn ($images) => $images->orderBy('sort_order')]),
            ])
            ->whereHas('seller', fn (Builder $seller) => $seller->where('status', 'active'))
            ->where(fn (Builder $query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', now()))
            ->where(fn (Builder $query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', now()))
            ->orderByRaw('(compare_at_price - price) / compare_at_price DESC')
            ->limit($limit)
            ->get()
            ->map(fn (Offer $offer): array => [
                'offer' => (new OfferResource($offer))->resolve(),
                'product' => (new ProductResource($offer->product))->resolve(),
            ])
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function curatedItems(HomepageSection $section, int $limit): array
    {
        $items = $section->items()
            ->where(function (Builder $query): void {
                $query->whereHas('product', fn (Builder $products) => $products->where('status', 'active'))
                    ->orWhereHas('offer', function (Builder $offers): void {
                        $this->activeOffers($offers);
                        $offers->whereHas('product', fn (Builder $products) => $products->where('status', 'active'));
                    });
            })
            ->with([
                'product' => fn ($products) => $products
                    ->where('status', 'active')
                    ->with(['images' => fn ($images) => $images->orderBy('sort_order')])
                    ->withMin(['offers as minimum_price' => fn (Builder $offers) => $this->activeOffers($offers)], 'price'),
                'offer' => fn ($offers) => $this->activeOffers($offers)->with(['product.images', 'seller', 'platform', 'region']),
            ])
            ->limit($limit)
            ->get();

        return $items->map(fn ($item): array => [
            'product' => $item->product
                ? (new ProductResource($item->product))->resolve()
                : (new ProductResource($item->offer->product))->resolve(),
            'offer' => $item->offer ? (new OfferResource($item->offer))->resolve() : null,
        ])->all();
    }

    private function activeOffers(Builder|Relation $offers): Builder|Relation
    {
        $now = Carbon::now();

        return $offers
            ->where('status', 'active')
            ->whereHas('seller', fn (Builder $seller) => $seller->where('status', 'active'))
            ->where(fn (Builder $query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
            ->where(fn (Builder $query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', $now));
    }
}
