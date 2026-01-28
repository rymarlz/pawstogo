<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
  public function up(): void
  {
    Schema::create('budgets', function (Blueprint $table) {
      $table->id();

      $table->string('code')->unique(); // ej: B-20260106-000001
      $table->string('title')->nullable();

      $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
      $table->foreignId('tutor_id')->nullable()->constrained('tutors')->nullOnDelete();
      $table->foreignId('consultation_id')->nullable()->constrained('consultations')->nullOnDelete();

      $table->string('status')->default('draft'); // draft|sent|accepted|rejected|expired
      $table->string('currency', 10)->default('CLP');
      $table->date('valid_until')->nullable();

      $table->text('notes')->nullable();
      $table->text('terms')->nullable();

      $table->decimal('subtotal', 14, 2)->default(0);
      $table->decimal('discount_total', 14, 2)->default(0);
      $table->decimal('tax_total', 14, 2)->default(0);
      $table->decimal('total', 14, 2)->default(0);

      $table->timestamp('sent_at')->nullable();

      $table->unsignedBigInteger('created_by')->nullable();
      $table->unsignedBigInteger('updated_by')->nullable();

      $table->softDeletes();
      $table->timestamps();

      $table->index(['patient_id']);
      $table->index(['tutor_id']);
      $table->index(['status']);
    });
  }

  public function down(): void
  {
    Schema::dropIfExists('budgets');
  }
};
