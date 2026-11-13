<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Offer extends Model
{
    protected $fillable = [
        'product_id',
        'seller_id',
        'platform_id',
        'region_id',
        'price',
        'compare_at_price',
        'currency',
        'status',
        'starts_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'compare_at_price' => 'decimal:2',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    public function platform(): BelongsTo
    {
        return $this->belongsTo(Platform::class);
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function digitalKeys(): HasMany
    {
        return $this->hasMany(DigitalKey::class);
    }

    public function cartItems(): HasMany
    {
        return $this->hasMany(CartItem::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function isActiveForPurchase(): bool
    {
        $productIsActive = $this->relationLoaded('product')
            ? $this->product->status === 'active'
            : $this->product()->where('status', 'active')->exists();
        $sellerIsActive = $this->relationLoaded('seller')
            ? $this->seller->status === 'active'
            : $this->seller()->where('status', 'active')->exists();

        return $this->status === 'active'
            && $productIsActive
            && $sellerIsActive
            && ($this->starts_at === null || $this->starts_at->isPast())
            && ($this->ends_at === null || $this->ends_at->isFuture());
    }
}
