<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Product extends Model
{
    protected $fillable = [
        'slug',
        'title',
        'short_description',
        'description',
        'developer',
        'publisher',
        'release_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'release_date' => 'date',
        ];
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class);
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class);
    }

    public function platforms(): BelongsToMany
    {
        return $this->belongsToMany(Platform::class);
    }

    public function regions(): BelongsToMany
    {
        return $this->belongsToMany(Region::class, 'region_product');
    }

    public function offers(): HasMany
    {
        return $this->hasMany(Offer::class);
    }

    public function homepageSectionItems(): HasMany
    {
        return $this->hasMany(HomepageSectionItem::class);
    }

    public function bestSellingSummary(): HasOne
    {
        return $this->hasOne(BestSellingProduct::class);
    }
}
