<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('homepage_sections', function (Blueprint $table) {
            $table->id();
            $table->string('section_key', 80)->unique();
            $table->string('title', 180);
            $table->string('section_type', 30);
            $table->boolean('is_active')->default(true);
            $table->smallInteger('sort_order')->default(0);
            $table->timestampTz('starts_at')->nullable();
            $table->timestampTz('ends_at')->nullable();
            $table->jsonb('settings')->nullable();
            $table->timestampsTz();

            $table->index(['is_active', 'sort_order']);
        });

        DB::statement("ALTER TABLE homepage_sections ADD CONSTRAINT homepage_sections_type_check CHECK (section_type IN ('banner', 'best_sellers', 'deals', 'curated'))");
        DB::statement('ALTER TABLE homepage_sections ADD CONSTRAINT homepage_sections_dates_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)');

        Schema::create('homepage_section_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('homepage_sections')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('offer_id')->nullable()->constrained()->restrictOnDelete();
            $table->smallInteger('sort_order')->default(0);
            $table->timestampsTz();

            $table->unique(['section_id', 'sort_order']);
            $table->index('product_id');
            $table->index('offer_id');
        });

        DB::statement('ALTER TABLE homepage_section_items ADD CONSTRAINT homepage_section_items_target_check CHECK ((product_id IS NOT NULL AND offer_id IS NULL) OR (product_id IS NULL AND offer_id IS NOT NULL))');
    }

    public function down(): void
    {
        Schema::dropIfExists('homepage_section_items');
        Schema::dropIfExists('homepage_sections');
    }
};
