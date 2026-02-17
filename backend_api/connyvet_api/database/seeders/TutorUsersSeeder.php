<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Tutor;
use Illuminate\Database\Seeder;

/**
 * Crea un User por cada Tutor con el mismo email, para que la app móvil
 * pueda iniciar sesión como tutor y recibir tutor_id en la respuesta.
 * Contraseña de prueba: tutor1234
 */
class TutorUsersSeeder extends Seeder
{
    public function run(): void
    {
        $tutors = Tutor::where('active', true)->get();

        foreach ($tutors as $tutor) {
            $email = trim($tutor->email ?? '');
            if ($email === '') {
                continue;
            }

            User::updateOrCreate(
                ['email' => $email],
                [
                    'name'      => $tutor->name,
                    'password'  => 'tutor1234', // el mutator del modelo lo hashea
                    'role'      => User::ROLE_TUTOR,
                    'is_active' => true,
                    'status'    => 'active',
                    'locale'    => 'es',
                    'timezone'  => 'America/Santiago',
                ]
            );
        }
    }
}
