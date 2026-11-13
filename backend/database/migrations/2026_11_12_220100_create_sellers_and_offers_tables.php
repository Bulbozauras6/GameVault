<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sellers', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('slug', 180)->unique();
            $table->string('status', 20)->default('active');
            $table->timestampsTz();
        });

        DB::statement("ALTER TABLE sellers ADD CONSTRAINT sellers_status_check CHECK (status IN ('active', 'inactive'))");

        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('seller_id')->constrained()->restrictOnDelete();
            $table->foreignId('platform_id')->constrained()->restrictOnDelete();
            $table->foreignId('region_id')->constrained()->restrictOnDelete();
            $table->decimal('price', 12, 2);
            $table->decimal('compare_at_price', 12, 2)->nullable();
            $table->char('currency', 3)->default('USD');
            $table->string('status', 20)->default('active');
            $table->timestampTz('starts_at')->nullable();
            $table->timestampTz('ends_at')->nullable();
            $table->timestampsTz();

            $table->index(['product_id', 'status', 'price']);
            $table->index(['platform_id', 'region_id', 'status', 'price']);
            $table->index(['seller_id', 'status']);
        });

        DB::statement("ALTER TABLE offers ADD CONSTRAINT offers_status_check CHECK (status IN ('active', 'inactive'))");
        DB::statement('ALTER TABLE offers ADD CONSTRAINT offers_price_check CHECK (price >= 0 AND (compare_at_price IS NULL OR compare_at_price >= price))');
        DB::statement("ALTER TABLE offers ADD CONSTRAINT offers_currency_check CHECK (currency ~ '^[A-Z]{3}$')");
        DB::statement('ALTER TABLE offers ADD CONSTRAINT offers_dates_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)');
    }

    public function down(): void
    {
        Schema::dropIfExists('offers');
        Schema::dropIfExists('sellers');
    }
};
