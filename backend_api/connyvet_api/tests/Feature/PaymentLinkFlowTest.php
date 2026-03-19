<?php

namespace Tests\Feature;

use App\Mail\PaymentLinkMail;
use App\Models\Payment;
use App\Models\Patient;
use App\Models\Tutor;
use App\Models\User;
use App\Services\PaymentLinkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PaymentLinkFlowTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Patient $patient;
    protected Tutor $tutorWithEmail;
    protected Tutor $tutorWithoutEmail;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['role' => 'admin']);
        $this->tutorWithEmail = Tutor::create([
            'nombres'   => 'Juan',
            'apellidos' => 'Pérez',
            'email'     => 'juan@test.com',
            'active'    => true,
        ]);
        $this->tutorWithoutEmail = Tutor::create([
            'nombres'   => 'María',
            'apellidos' => 'Sin Email',
            'email'     => null,
            'active'    => true,
        ]);
        $this->patient = Patient::create([
            'tutor_id'    => $this->tutorWithEmail->id,
            'name'        => 'Firulais',
            'species'     => 'canino',
            'breed'       => 'Mestizo',
            'sex'         => 'macho',
            'tutor_name'  => 'Juan Pérez',
            'active'     => true,
        ]);
    }

    public function test_creates_payment_and_generates_link_when_mp_available(): void
    {
        $checkoutUrl = 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=TEST-123';
        $this->mock(PaymentLinkService::class, function ($mock) use ($checkoutUrl) {
            $mock->shouldReceive('createPreferenceForPayment')
                ->once()
                ->andReturn([
                    'checkout_url'      => $checkoutUrl,
                    'preference_id'     => 'TEST-PREF-123',
                    'external_reference' => 'P-1',
                ]);
        });

        Mail::fake();

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/payments', [
                'patient_id' => $this->patient->id,
                'tutor_id'   => $this->tutorWithEmail->id,
                'concept'    => 'Consulta veterinaria',
                'amount'     => 25000,
                'status'     => 'pending',
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.payment_link', $checkoutUrl);
        $response->assertJsonPath('data.mp_preference_id', 'TEST-PREF-123');
        $response->assertJsonPath('data.external_reference', 'P-1');

        Mail::assertSent(PaymentLinkMail::class, function ($mail) use ($checkoutUrl) {
            return $mail->paymentLink === $checkoutUrl;
        });

        $payment = Payment::first();
        $this->assertNotNull($payment->email_sent_at);
        $this->assertNull($payment->email_error);
    }

    public function test_creates_payment_without_email_when_tutor_has_no_email(): void
    {
        $patientNoEmail = Patient::create([
            'tutor_id'   => $this->tutorWithoutEmail->id,
            'name'       => 'Luna',
            'species'    => 'felino',
            'breed'     => 'Mestizo',
            'sex'       => 'hembra',
            'tutor_name' => 'María Sin Email',
            'active'    => true,
        ]);

        $checkoutUrl = 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=TEST-456';
        $this->mock(PaymentLinkService::class, function ($mock) use ($checkoutUrl) {
            $mock->shouldReceive('createPreferenceForPayment')
                ->once()
                ->andReturn([
                    'checkout_url'       => $checkoutUrl,
                    'preference_id'     => 'TEST-PREF-456',
                    'external_reference' => 'P-1',
                ]);
        });

        Mail::fake();

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/payments', [
                'patient_id' => $patientNoEmail->id,
                'tutor_id'   => $this->tutorWithoutEmail->id,
                'concept'    => 'Vacuna',
                'amount'     => 15000,
                'status'     => 'pending',
            ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.payment_link', $checkoutUrl);
        $response->assertJsonPath('message', 'Pago creado. Link generado. No se envió email: el tutor no tiene correo configurado.');

        Mail::assertNotSent(PaymentLinkMail::class);

        $payment = Payment::first();
        $this->assertNull($payment->email_sent_at);
        $this->assertSame('Tutor sin correo configurado', $payment->email_error);
    }

    public function test_creates_payment_even_when_mp_fails(): void
    {
        $this->mock(PaymentLinkService::class, function ($mock) {
            $mock->shouldReceive('createPreferenceForPayment')
                ->once()
                ->andThrow(new \RuntimeException('MP API error'));
        });

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/payments', [
                'patient_id' => $this->patient->id,
                'tutor_id'   => $this->tutorWithEmail->id,
                'concept'    => 'Consulta',
                'amount'     => 20000,
                'status'     => 'pending',
            ]);

        $response->assertStatus(201);
        $payment = Payment::first();
        $this->assertNotNull($payment);
        $this->assertNull($payment->payment_link);
        $this->assertStringContainsString('Pago creado. No se pudo generar el link', $response->json('message', ''));
    }

    public function test_paid_payment_does_not_create_link(): void
    {
        $this->mock(PaymentLinkService::class, function ($mock) {
            $mock->shouldNotReceive('createPreferenceForPayment');
        });

        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/payments', [
                'patient_id' => $this->patient->id,
                'tutor_id'   => $this->tutorWithEmail->id,
                'concept'    => 'Pago en caja',
                'amount'     => 10000,
                'status'     => 'paid',
                'method'     => 'efectivo',
            ]);

        $response->assertStatus(201);
        $payment = Payment::first();
        $this->assertNull($payment->payment_link);
    }
}
