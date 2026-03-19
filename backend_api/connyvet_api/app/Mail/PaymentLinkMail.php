<?php

namespace App\Mail;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PaymentLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Payment $payment,
        public string $paymentLink,
    ) {}

    public function build()
    {
        $patientName = $this->payment->patient?->name ?? 'su mascota';
        $subject = "Pago pendiente - {$this->payment->concept} - ConnyVet";

        return $this->subject($subject)
            ->view('emails.payment-link')
            ->with([
                'payment' => $this->payment,
                'paymentLink' => $this->paymentLink,
                'patientName' => $patientName,
                'amountFormatted' => number_format($this->payment->amount, 0, ',', '.') . ' CLP',
            ]);
    }
}
