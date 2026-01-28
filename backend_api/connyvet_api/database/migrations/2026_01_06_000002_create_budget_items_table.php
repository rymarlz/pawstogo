<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void
  {
    Schema::create('budget_items', function (Blueprint $table) {
      $table->id();
      $table->foreignId('budget_id')->constrained('budgets')->cascadeOnDelete();

      $table->integer('sort_order')->default(0);

      $table->string('name');
      $table->string('description')->nullable();

      $table->decimal('qty', 10, 2)->default(1);
      $table->decimal('unit_price', 14, 2)->default(0);

      // descuento en monto (no porcentaje) para simpleza
      $table->decimal('discount', 14, 2)->default(0);

      // IVA/Impuesto como porcentaje (ej: 19)
      $table->decimal('tax_rate', 6, 2)->default(0);

      $table->decimal('line_subtotal', 14, 2)->default(0);
      $table->decimal('line_tax', 14, 2)->default(0);
      $table->decimal('line_total', 14, 2)->default(0);

      $table->timestamps();

      $table->index(['budget_id', 'sort_order']);
    });
  }

  public function down(): void
  {
    Schema::dropIfExists('budget_items');
  }
};
