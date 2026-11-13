<?php

namespace App\Http\Resources;

use App\Models\DigitalKey;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'offer_id' => $this->offer_id,
            'product_id' => $this->product_id,
            'product_title' => $this->product_title_snapshot,
            'seller_name' => $this->seller_name_snapshot,
            'platform_name' => $this->platform_name_snapshot,
            'region_name' => $this->region_name_snapshot,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'line_total' => $this->line_total,
            'currency' => $this->currency,
            'digital_keys' => $this->whenLoaded(
                'digitalKeys',
                fn () => $this->digitalKeys->map(fn (DigitalKey $key): array => [
                    'id' => $key->id,
                    'key' => $key->encrypted_key,
                ])->values(),
            ),
        ];
    }
}
