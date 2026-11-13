<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DigitalKey extends Model
{
    protected $fillable = [
        'offer_id',
        'encrypted_key',
        'key_fingerprint',
        'status',
        'order_item_id',
        'assigned_at',
    ];

    protected $hidden = [
        'encrypted_key',
        'key_fingerprint',
    ];

    protected function casts(): array
    {
        return [
            'encrypted_key' => 'encrypted',
            'assigned_at' => 'datetime',
        ];
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(Offer::class);
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }
}
