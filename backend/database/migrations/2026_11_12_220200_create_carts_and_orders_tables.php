<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->timestampsTz();
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->foreignId('offer_id')->constrained()->restrictOnDelete();
            $table->integer('quantity')->default(1);
            $table->timestampsTz();

            $table->unique(['cart_id', 'offer_id']);
            $table->index('offer_id');
        });

        DB::statement('ALTER TABLE cart_items ADD CONSTRAINT cart_items_quantity_check CHECK (quantity > 0)');

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->uuid('order_number')->unique();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('status', 20)->default('pending');
            $table->string('payment_method', 30)->default('simulated');
            $table->uuid('payment_reference')->nullable()->unique();
            $table->char('currency', 3)->default('USD');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('total', 12, 2);
            $table->timestampTz('placed_at')->nullable();
            $table->timestampsTz();

            $table->index(['user_id', 'placed_at']);
            $table->index(['status', 'placed_at']);
        });

        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'completed', 'cancelled'))");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method = 'simulated')");
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_currency_check CHECK (currency ~ '^[A-Z]{3}$')");
        DB::statement('ALTER TABLE orders ADD CONSTRAINT orders_totals_check CHECK (subtotal >= 0 AND total >= 0)');
        DB::statement("ALTER TABLE orders ADD CONSTRAINT orders_placed_at_check CHECK ((status = 'completed' AND placed_at IS NOT NULL AND payment_reference IS NOT NULL) OR (status <> 'completed' AND placed_at IS NULL))");

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('offer_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('seller_id')->constrained()->restrictOnDelete();
            $table->integer('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('line_total', 12, 2);
            $table->char('currency', 3);
            $table->string('product_title_snapshot');
            $table->string('seller_name_snapshot', 150);
            $table->string('platform_name_snapshot', 100);
            $table->string('region_name_snapshot', 100);
            $table->timestampsTz();

            $table->unique(['id', 'offer_id']);
            $table->index(['product_id', 'order_id']);

        });

        DB::statement('ALTER TABLE order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0)');
        DB::statement('ALTER TABLE order_items ADD CONSTRAINT order_items_amounts_check CHECK (unit_price >= 0 AND line_total >= 0 AND line_total = unit_price * quantity)');
        DB::statement("ALTER TABLE order_items ADD CONSTRAINT order_items_currency_check CHECK (currency ~ '^[A-Z]{3}$')");
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
    }
};
