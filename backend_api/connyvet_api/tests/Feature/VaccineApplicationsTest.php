<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\Tutor;
use App\Models\User;
use App\Models\Vaccine;
use App\Models\VaccineApplication;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VaccineApplicationsTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function store_assigns_tutor_id_from_patient(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'is_active' => true]);
        Sanctum::actingAs($admin);

        $tutor = Tutor::create([
            'nombres'  => 'Juan',
            'apellidos'=> 'Pérez',
            'email'    => 'juan@test.com',
        ]);

        $patient = Patient::create([
            'tutor_id'     => $tutor->id,
            'name'         => 'Perro Test',
            'species'      => 'perro',
            'sex'          => 'macho',
            'tutor_name'   => 'Juan Pérez',
            'tutor_email'  => 'juan@test.com',
            'active'       => true,
        ]);

        $vaccine = Vaccine::create([
            'name'                 => 'Antirrábica',
            'species'              => 'perro',
            'default_interval_days'=> 365,
            'is_core'              => true,
            'active'               => true,
        ]);

        $response = $this->postJson('/api/v1/vaccine-applications', [
            'patient_id'   => $patient->id,
            'vaccine_id'   => $vaccine->id,
            'planned_date' => Carbon::tomorrow()->toDateString(),
            'status'       => 'pendiente',
        ]);

        $response->assertStatus(201);

        $data = $response->json('data');
        $this->assertSame($tutor->id, $data['tutor_id'], 'Response must include tutor_id');

        $app = VaccineApplication::find($data['id']);
        $this->assertSame($tutor->id, $app->tutor_id, 'DB must have tutor_id saved');
    }

    /** @test */
    public function tutor_role_cannot_create_for_another_tutors_patient(): void
    {
        $tutorA = Tutor::create([
            'nombres'  => 'Tutor A',
            'apellidos'=> 'Apellido',
            'email'    => 'tutor-a@test.com',
        ]);
        $tutorB = Tutor::create([
            'nombres'  => 'Tutor B',
            'apellidos'=> 'Apellido',
            'email'    => 'tutor-b@test.com',
        ]);

        $userTutorA = User::factory()->create([
            'role'  => User::ROLE_TUTOR,
            'email' => 'tutor-a@test.com',
            'is_active' => true,
        ]);
        Sanctum::actingAs($userTutorA);

        $patientOfB = Patient::create([
            'tutor_id'    => $tutorB->id,
            'name'        => 'Mascota de B',
            'species'     => 'gato',
            'sex'         => 'hembra',
            'tutor_name'  => 'Tutor B',
            'tutor_email' => 'tutor-b@test.com',
            'active'      => true,
        ]);

        $vaccine = Vaccine::create([
            'name'    => 'Triple felina',
            'species' => 'gato',
            'is_core' => true,
            'active'  => true,
        ]);

        $response = $this->postJson('/api/v1/vaccine-applications', [
            'patient_id'   => $patientOfB->id,
            'vaccine_id'   => $vaccine->id,
            'planned_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('vaccine_applications', ['patient_id' => $patientOfB->id]);
    }

    /** @test */
    public function tutor_role_can_create_for_own_patient(): void
    {
        $tutor = Tutor::create([
            'nombres'  => 'María',
            'apellidos'=> 'González',
            'email'    => 'maria@test.com',
        ]);

        $userTutor = User::factory()->create([
            'role'      => User::ROLE_TUTOR,
            'email'     => 'maria@test.com',
            'is_active' => true,
        ]);
        Sanctum::actingAs($userTutor);

        $patient = Patient::create([
            'tutor_id'    => $tutor->id,
            'name'        => 'Mascota de María',
            'species'     => 'perro',
            'sex'         => 'macho',
            'tutor_name'  => 'María González',
            'tutor_email' => 'maria@test.com',
            'active'      => true,
        ]);

        $vaccine = Vaccine::create([
            'name'    => 'Óctuple',
            'species' => 'perro',
            'is_core' => true,
            'active'  => true,
        ]);

        $response = $this->postJson('/api/v1/vaccine-applications', [
            'patient_id'   => $patient->id,
            'vaccine_id'   => $vaccine->id,
            'planned_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response->assertStatus(201);
        $data = $response->json('data');
        $this->assertSame($tutor->id, $data['tutor_id']);

        $app = VaccineApplication::find($data['id']);
        $this->assertSame($tutor->id, $app->tutor_id);
    }

    /** @test */
    public function index_with_tutor_id_returns_only_that_tutors_applications(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN, 'is_active' => true]);
        Sanctum::actingAs($admin);

        $tutorA = Tutor::create([
            'nombres'  => 'Tutor A',
            'apellidos'=> 'A',
            'email'    => 'a@test.com',
        ]);
        $tutorB = Tutor::create([
            'nombres'  => 'Tutor B',
            'apellidos'=> 'B',
            'email'    => 'b@test.com',
        ]);

        $patientA = Patient::create([
            'tutor_id'    => $tutorA->id,
            'name'        => 'Mascota A',
            'species'     => 'perro',
            'tutor_name'  => 'A',
            'tutor_email' => 'a@test.com',
            'active'      => true,
        ]);
        $patientB = Patient::create([
            'tutor_id'    => $tutorB->id,
            'name'        => 'Mascota B',
            'species'     => 'perro',
            'tutor_name'  => 'B',
            'tutor_email' => 'b@test.com',
            'active'      => true,
        ]);

        $vaccine = Vaccine::create([
            'name'    => 'Antirrábica',
            'species' => 'perro',
            'is_core' => true,
            'active'  => true,
        ]);

        VaccineApplication::create([
            'patient_id'   => $patientA->id,
            'tutor_id'     => $tutorA->id,
            'vaccine_id'   => $vaccine->id,
            'planned_date' => Carbon::tomorrow(),
            'status'       => 'pendiente',
            'active'       => true,
        ]);
        VaccineApplication::create([
            'patient_id'   => $patientB->id,
            'tutor_id'     => $tutorB->id,
            'vaccine_id'   => $vaccine->id,
            'planned_date' => Carbon::tomorrow()->addDays(2),
            'status'       => 'pendiente',
            'active'       => true,
        ]);

        $response = $this->getJson("/api/v1/vaccine-applications?tutor_id={$tutorA->id}&per_page=20");
        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertSame($tutorA->id, $data[0]['tutor_id']);
    }
}
