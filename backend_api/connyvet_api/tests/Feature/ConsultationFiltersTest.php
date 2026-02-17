<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\Patient;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConsultationFiltersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['app.timezone' => 'America/Santiago']);
    }

    /** @test */
    public function upcoming_consultations_includes_future_cita(): void
    {
        $user = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        Sanctum::actingAs($user);

        $patient = Patient::create([
            'name'        => 'Mascota Test',
            'species'     => 'perro',
            'sex'         => 'macho',
            'tutor_name'  => 'Tutor',
            'tutor_email' => 'tutor@test.com',
            'active'      => true,
        ]);

        $future = Carbon::now('America/Santiago')->addHours(2);
        $consultation = Consultation::create([
            'patient_id' => $patient->id,
            'date'       => $future,
            'reason'     => 'Control',
            'status'     => 'cerrada',
            'active'     => true,
        ]);

        $response = $this->getJson('/api/v1/consultations?upcoming=1&per_page=20');
        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertIsArray($data);
        $ids = array_column($data, 'id');
        $this->assertContains($consultation->id, $ids, 'Upcoming consultations should include the created cita');
    }

    /** @test */
    public function patient_id_filter_returns_only_that_patient_consultations(): void
    {
        $user = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        Sanctum::actingAs($user);

        $patientA = Patient::create([
            'name'        => 'Paciente A',
            'species'     => 'perro',
            'sex'         => 'macho',
            'tutor_name'  => 'Tutor A',
            'tutor_email' => 'a@test.com',
            'active'      => true,
        ]);
        $patientB = Patient::create([
            'name'        => 'Paciente B',
            'species'     => 'gato',
            'sex'         => 'hembra',
            'tutor_name'  => 'Tutor B',
            'tutor_email' => 'b@test.com',
            'active'      => true,
        ]);

        Consultation::create([
            'patient_id' => $patientA->id,
            'date'       => now(),
            'reason'     => 'Consulta A',
            'status'     => 'cerrada',
            'active'     => true,
        ]);
        Consultation::create([
            'patient_id' => $patientB->id,
            'date'       => now(),
            'reason'     => 'Consulta B',
            'status'     => 'cerrada',
            'active'     => true,
        ]);

        $response = $this->getJson("/api/v1/consultations?patient_id={$patientA->id}&per_page=20");
        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals($patientA->id, $data[0]['patient_id']);
    }

    /** @test */
    public function consultation_show_includes_labels_and_clinical_sections_with_five_keys(): void
    {
        $user = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        Sanctum::actingAs($user);

        $patient = Patient::create([
            'name'        => 'Paciente',
            'species'     => 'perro',
            'sex'         => 'macho',
            'tutor_name'  => 'Tutor',
            'tutor_email' => 't@test.com',
            'active'      => true,
        ]);

        $consultation = Consultation::create([
            'patient_id'        => $patient->id,
            'date'              => now(),
            'reason'            => 'Motivo test',
            'anamnesis'         => 'Anamnesis test',
            'diagnosis_primary' => 'Dx 1',
            'diagnosis_secondary'=> 'Dx 2',
            'treatment'         => 'Tratamiento test',
            'recommendations'   => 'Recomendaciones test',
            'status'            => 'cerrada',
            'active'            => true,
        ]);

        $response = $this->getJson("/api/v1/consultations/{$consultation->id}");
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertArrayHasKey('labels', $data);
        $this->assertArrayHasKey('clinical_sections', $data);

        $expectedLabelKeys = ['reason', 'anamnesis', 'diagnosis', 'treatment', 'recommendations'];
        foreach ($expectedLabelKeys as $key) {
            $this->assertArrayHasKey($key, $data['labels'], "labels must contain key: {$key}");
        }
        $this->assertSame('Motivo de consulta', $data['labels']['reason']);
        $this->assertSame('Anamnesis', $data['labels']['anamnesis']);
        $this->assertSame('Diagnóstico', $data['labels']['diagnosis']);
        $this->assertSame('Tratamiento', $data['labels']['treatment']);
        $this->assertSame('Recomendaciones', $data['labels']['recommendations']);

        foreach ($expectedLabelKeys as $key) {
            $this->assertArrayHasKey($key, $data['clinical_sections'], "clinical_sections must contain key: {$key}");
        }
        $this->assertSame('Motivo test', $data['clinical_sections']['reason']);
        $this->assertSame('Anamnesis test', $data['clinical_sections']['anamnesis']);
        $this->assertStringContainsString('Dx 1', $data['clinical_sections']['diagnosis']);
        $this->assertStringContainsString('Dx 2', $data['clinical_sections']['diagnosis']);
        $this->assertSame('Tratamiento test', $data['clinical_sections']['treatment']);
        $this->assertSame('Recomendaciones test', $data['clinical_sections']['recommendations']);
    }
}
