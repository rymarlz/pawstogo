<?php

namespace App\Mail;

use App\Models\Budget;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BudgetPdfMail extends Mailable
{
  use Queueable, SerializesModels;

  public function __construct(
    public Budget $budget,
    public string $pdfBinary,
    public ?string $customMessage = null,
  ) {}

  public function build()
  {
    $subject = "Presupuesto {$this->budget->code} - ConnyVet";

    return $this->subject($subject)
      ->view('emails.budget')
      ->with([
        'budget' => $this->budget,
        'customMessage' => $this->customMessage,
      ])
      ->attachData($this->pdfBinary, "presupuesto-{$this->budget->code}.pdf", [
        'mime' => 'application/pdf',
      ]);
  }
}
