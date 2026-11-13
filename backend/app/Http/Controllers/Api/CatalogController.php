<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductIndexRequest;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Offer;
use App\Models\Platform;
use App\Models\Product;
use App\Models\Region;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

class CatalogController extends Controller
{
    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->where('is_active', true)
            ->whereHas('products', fn (Builder $products) => $products->where('status', 'active'))
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description']);

        return response()->json(['data' => $categories]);
    }

    public function platforms(): JsonResponse
    {
        $platforms = Platform::query()
            ->whereHas('products', fn (Builder $products) => $products->where('status', 'active'))
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        return response()->json(['data' => $platforms]);
    }

    public function regions(): JsonResponse
    {
        $regions = Region::query()
            ->whereHas('products', fn (Builder $products) => $products->where('status', 'active'))
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return response()->json(['data' => $regions]);
    }

    public function products(ProductIndexRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $offersForFilters = $this->activeOffersForFilters($filters);

        $products = Product::query()
            ->where('status', 'active')
            ->with(['images' => fn ($images) => $images->orderBy('sort_order')])
            ->withMin(['offers as minimum_price' => $offersForFilters], 'price')
            ->addSelect([
                'minimum_price_currency' => $this->minimumOfferCurrencyQuery($filters),
            ]);

        if ($search = trim((string) ($filters['search'] ?? ''))) {
            $escapedSearch = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($search));
            $products->where(function (Builder $query) use ($search, $escapedSearch): void {
                $query->whereRaw('lower(products.title) % lower(?)', [$search])
                    ->orWhereRaw("lower(products.title) LIKE ? ESCAPE '!'", ["%{$escapedSearch}%"]);
            });
        }

        if (! empty($filters['category'])) {
            $products->whereHas('categories', fn (Builder $categories) => $categories
                ->where('slug', $filters['category'])
                ->where('is_active', true));
        }

        if (! empty($filters['platform'])) {
            $products->whereHas('platforms', fn (Builder $platforms) => $platforms->where('slug', $filters['platform']));
        }

        if (! empty($filters['region'])) {
            $products->whereHas('regions', fn (Builder $regions) => $regions->where('code', $filters['region']));
        }

        if (isset($filters['min_price'])) {
            $products->whereHas('offers', $offersForFilters);
            $products->whereDoesntHave('offers', function (Builder $offers) use ($offersForFilters, $filters): void {
                $offersForFilters($offers);
                $offers->where('price', '<', $filters['min_price']);
            });
        }

        if (isset($filters['max_price'])) {
            $products->whereHas('offers', function (Builder $offers) use ($offersForFilters, $filters): void {
                $offersForFilters($offers);
                $offers->where('price', '<=', $filters['max_price']);
            });
        }

        $sort = $filters['sort'] ?? 'relevance';
        match ($sort) {
            'price_asc' => $products->orderBy('minimum_price')->orderBy('id'),
            'price_desc' => $products->orderByRaw('minimum_price DESC NULLS LAST')->orderBy('id'),
            'title_asc' => $products->orderBy('title')->orderBy('id'),
            'title_desc' => $products->orderByDesc('title')->orderBy('id'),
            'newest' => $products->orderByRaw('release_date DESC NULLS LAST')->orderBy('id'),
            'relevance' => $search !== ''
                ? $products->orderByRaw('similarity(lower(products.title), lower(?)) DESC', [$search])->orderBy('id')
                : $products->orderByDesc('created_at')->orderBy('id'),
        };

        return ProductResource::collection(
            $products->paginate((int) ($filters['per_page'] ?? 12))->withQueryString(),
        );
    }

    public function show(string $slug): ProductResource
    {
        $product = Product::query()
            ->where('status', 'active')
            ->where('slug', $slug)
            ->with([
                'images' => fn ($images) => $images->orderBy('sort_order'),
                'categories' => fn ($categories) => $categories->where('is_active', true)->orderBy('name'),
                'platforms' => fn ($platforms) => $platforms->orderBy('name'),
                'regions' => fn ($regions) => $regions->orderBy('name'),
                'offers' => fn ($offers) => $this->applyActiveOfferConstraints($offers)
                    ->withCount([
                        'digitalKeys as available_stock' => fn (Builder $keys) => $keys->where('status', 'available'),
                    ])
                    ->with(['seller', 'platform', 'region'])
                    ->orderBy('price'),
            ])
            ->firstOrFail();

        return new ProductResource($product);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return \Closure(Builder): void
     */
    private function activeOffersForFilters(array $filters): \Closure
    {
        return function (Builder $offers) use ($filters): void {
            $this->applyActiveOfferConstraints($offers);

            if (! empty($filters['platform'])) {
                $offers->whereHas('platform', fn (Builder $platform) => $platform->where('slug', $filters['platform']));
            }

            if (! empty($filters['region'])) {
                $offers->whereHas('region', fn (Builder $region) => $region->where('code', $filters['region']));
            }
        };
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function minimumOfferCurrencyQuery(array $filters): Builder
    {
        $offers = Offer::query()
            ->select('currency')
            ->whereColumn('offers.product_id', 'products.id');

        $this->activeOffersForFilters($filters)($offers);

        return $offers->orderBy('price')->orderBy('id')->limit(1);
    }

    private function applyActiveOfferConstraints(Builder|Relation $offers): Builder|Relation
    {
        $now = Carbon::now();

        return $offers
            ->where('status', 'active')
            ->whereHas('seller', fn (Builder $seller) => $seller->where('status', 'active'))
            ->where(fn (Builder $query) => $query->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
            ->where(fn (Builder $query) => $query->whereNull('ends_at')->orWhere('ends_at', '>', $now));
    }
}
