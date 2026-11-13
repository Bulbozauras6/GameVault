<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('digital_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('offer_id')->constrained()->restrictOnDelete();
            $table->text('encrypted_key');
            $table->char('key_fingerprint', 64)->unique();
            $table->string('status', 20)->default('available');
            $table->foreignId('order_item_id')->nullable();
            $table->timestampTz('assigned_at')->nullable();
            $table->timestampsTz();

            $table->foreign(['order_item_id', 'offer_id'], 'digital_keys_order_item_offer_fk')
                ->references(['id', 'offer_id'])
                ->on('order_items')
                ->restrictOnDelete();
        });

        DB::statement("ALTER TABLE digital_keys ADD CONSTRAINT digital_keys_status_check CHECK (status IN ('available', 'assigned', 'revoked'))");
        DB::statement("ALTER TABLE digital_keys ADD CONSTRAINT digital_keys_assignment_check CHECK ((status = 'available' AND order_item_id IS NULL AND assigned_at IS NULL) OR (status = 'assigned' AND order_item_id IS NOT NULL AND assigned_at IS NOT NULL) OR status = 'revoked')");
        DB::statement("CREATE INDEX digital_keys_available_offer_idx ON digital_keys (offer_id, id) WHERE status = 'available'");
        DB::statement('CREATE INDEX digital_keys_order_item_idx ON digital_keys (order_item_id) WHERE order_item_id IS NOT NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('digital_keys');
    }
};
