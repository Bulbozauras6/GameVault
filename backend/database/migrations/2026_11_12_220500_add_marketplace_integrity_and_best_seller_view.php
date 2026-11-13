<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            $table->unique(['id', 'product_id']);
            $table->unique(['id', 'seller_id']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->foreign(['offer_id', 'product_id'], 'order_items_offer_product_fk')
                ->references(['id', 'product_id'])
                ->on('offers')
                ->restrictOnDelete();
            $table->foreign(['offer_id', 'seller_id'], 'order_items_offer_seller_fk')
                ->references(['id', 'seller_id'])
                ->on('offers')
                ->restrictOnDelete();
        });

        DB::statement(<<<'SQL'
            CREATE VIEW best_selling_products AS
            SELECT
                order_items.product_id,
                SUM(order_items.quantity)::BIGINT AS units_sold
            FROM order_items
            INNER JOIN orders ON orders.id = order_items.order_id
            WHERE orders.status = 'completed'
                AND orders.placed_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
            GROUP BY order_items.product_id
            SQL);
    }

    public function down(): void
    {
        DB::statement('DROP VIEW IF EXISTS best_selling_products');

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropForeign('order_items_offer_product_fk');
            $table->dropForeign('order_items_offer_seller_fk');
        });

        Schema::table('offers', function (Blueprint $table) {
            $table->dropUnique(['id', 'product_id']);
            $table->dropUnique(['id', 'seller_id']);
        });
    }
};
