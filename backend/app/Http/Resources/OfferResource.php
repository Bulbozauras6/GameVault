<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OfferResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'price' => $this->price,
            'compare_at_price' => $this->compare_at_price,
            'currency' => $this->currency,
            'available_stock' => $this->when(
                array_key_exists('available_stock', $this->resource->getAttributes()),
                (int) $this->available_stock,
            ),
            'platform' => $this->whenLoaded('platform', fn () => [
                'id' => $this->platform->id,
                'name' => $this->platform->name,
                'slug' => $this->platform->slug,
            ]),
            'region' => $this->whenLoaded('region', fn () => [
                'id' => $this->region->id,
                'name' => $this->region->name,
                'code' => $this->region->code,
            ]),
            'seller' => $this->whenLoaded('seller', fn () => [
                'id' => $this->seller->id,
                'name' => $this->seller->name,
                'slug' => $this->seller->slug,
            ]),
        ];
    }
}
