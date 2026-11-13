<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HomepageSection extends Model
{
    protected $fillable = [
        'section_key',
        'title',
        'section_type',
        'is_active',
        'sort_order',
        'starts_at',
        'ends_at',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'settings' => 'array',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(HomepageSectionItem::class, 'section_id')->orderBy('sort_order');
    }
}
