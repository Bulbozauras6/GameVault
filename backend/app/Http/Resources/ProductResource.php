<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->title,
            'short_description' => $this->short_description,
            'description' => $this->when(isset($this->description), $this->description),
            'developer' => $this->when(isset($this->developer), $this->developer),
            'publisher' => $this->when(isset($this->publisher), $this->publisher),
            'release_date' => $this->release_date?->toDateString(),
            'minimum_price' => $this->when(
                array_key_exists('minimum_price', $this->resource->getAttributes()),
                $this->minimum_price,
            ),
            'currency' => $this->when(
                array_key_exists('minimum_price_currency', $this->resource->getAttributes())
                    || ($this->relationLoaded('offers') && $this->offers->isNotEmpty()),
                fn () => array_key_exists('minimum_price_currency', $this->resource->getAttributes())
                    ? $this->minimum_price_currency
                    : $this->offers->first()->currency,
            ),
            'images' => $this->whenLoaded(
                'images',
                fn () => $this->images->map(fn ($image) => [
                    'url' => $image->image_url,
                    'alt_text' => $image->alt_text,
                    'is_primary' => $image->is_primary,
                ])->values(),
            ),
            'categories' => $this->whenLoaded(
                'categories',
                fn () => $this->categories->map(fn ($category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                ])->values(),
            ),
            'platforms' => $this->whenLoaded(
                'platforms',
                fn () => $this->platforms->map(fn ($platform) => [
                    'id' => $platform->id,
                    'name' => $platform->name,
                    'slug' => $platform->slug,
                ])->values(),
            ),
            'regions' => $this->whenLoaded(
                'regions',
                fn () => $this->regions->map(fn ($region) => [
                    'id' => $region->id,
                    'name' => $region->name,
                    'code' => $region->code,
                ])->values(),
            ),
            'offers' => OfferResource::collection($this->whenLoaded('offers')),
            'units_sold' => $this->when(
                $this->relationLoaded('bestSellingSummary') && $this->bestSellingSummary,
                fn () => $this->bestSellingSummary->units_sold,
            ),
        ];
    }
}
