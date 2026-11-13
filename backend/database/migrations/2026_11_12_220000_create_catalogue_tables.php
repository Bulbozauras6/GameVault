<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 120)->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
        });

        Schema::create('platforms', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 120)->unique();
            $table->timestampsTz();
        });

        Schema::create('regions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('code', 20)->unique();
            $table->timestampsTz();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 180)->unique();
            $table->string('title');
            $table->string('short_description', 500)->nullable();
            $table->text('description');
            $table->string('developer')->nullable();
            $table->string('publisher')->nullable();
            $table->date('release_date')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestampsTz();

            $table->index(['status', 'title']);
        });

        DB::statement("ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('active', 'inactive'))");
        DB::statement('CREATE INDEX products_title_trgm_idx ON products USING GIN (lower(title) gin_trgm_ops)');

        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->text('image_url');
            $table->string('alt_text')->nullable();
            $table->smallInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestampsTz();

            $table->index(['product_id', 'sort_order']);
        });

        DB::statement('CREATE UNIQUE INDEX product_images_one_primary_idx ON product_images (product_id) WHERE is_primary');

        Schema::create('category_product', function (Blueprint $table) {
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['category_id', 'product_id']);
            $table->index('product_id');
        });

        Schema::create('platform_product', function (Blueprint $table) {
            $table->foreignId('platform_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['platform_id', 'product_id']);
            $table->index('product_id');
        });

        Schema::create('region_product', function (Blueprint $table) {
            $table->foreignId('region_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->primary(['region_id', 'product_id']);
            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('region_product');
        Schema::dropIfExists('platform_product');
        Schema::dropIfExists('category_product');
        Schema::dropIfExists('product_images');
        Schema::dropIfExists('products');
        Schema::dropIfExists('regions');
        Schema::dropIfExists('platforms');
        Schema::dropIfExists('categories');
    }
};
