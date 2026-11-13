<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Region extends Model
{
    protected $fillable = [
        'name',
        'code',
    ];

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'region_product');
    }
}
