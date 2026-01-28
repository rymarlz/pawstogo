<?php

namespace App\Services;

use App\Models\Budget;
use Barryvdh\DomPDF\Facade\Pdf;

class BudgetPdfService
{
  public function render(Budget $budget): string
  {
    $budget->load(['items', 'patient', 'tutor', 'consultation']);

    $pdf = Pdf::loadView('pdfs.budget', [
      'budget' => $budget,
    ])->setPaper('a4');

    return $pdf->output();
  }
}
