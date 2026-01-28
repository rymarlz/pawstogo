<?php

namespace Database\Seeders;

use App\Models\Vaccine;
use Illuminate\Database\Seeder;

class VaccineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        $records = [
            // 🐶 PERROS – CORE
            [
                'name'                 => 'Múltiple canina (óctuple)',
                'species'              => 'perro',
                'manufacturer'         => 'Genérico',
                'short_description'    => 'Moquillo, parvovirus, adenovirus, parainfluenza y leptospira.',
                'description'          => 'Vacuna polivalente canina utilizada en el plan de primovacunación y refuerzos anuales. Cubre las principales enfermedades virales y bacterianas de perros.',
                'default_dose_ml'      => 1.0,
                'route'                => 'SC',
                'min_age_weeks'        => 6,
                'max_age_weeks'        => 999,
                'default_interval_days'=> 365,
                'is_core'              => true,
                'active'               => true,
                'extra_data'           => [
                    'code'          => 'CAN-CORE-8',
                    'series_doses'  => 3,
                    'series_gap_days' => 21,
                    'validity_days' => 365,
                    'storage_temp_c'=> '2-8',
                ],
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            [
                'name'                 => 'Parvovirus canino monovalente',
                'species'              => 'perro',
                'manufacturer'         => 'Genérico',
                'short_description'    => 'Vacuna monovalente frente a parvovirus canino.',
                'description'          => 'Utilizada en cachorros en alto riesgo o en brotes de parvovirosis. Puede administrarse como refuerzo específico.',
                'default_dose_ml'      => 1.0,
                'route'                => 'SC',
                'min_age_weeks'        => 6,
                'max_age_weeks'        => 20,
                'default_interval_days'=> 21,
                'is_core'              => true,
                'active'               => true,
                'extra_data'           => [
                    'code'          => 'CAN-PV-MONO',
                    'series_doses'  => 2,
                    'series_gap_days' => 21,
                    'notes'         => 'Reforzar especialmente en criaderos o zonas endémicas.',
                ],
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            [
                'name'                 => 'Rabia canina inactivada',
                'species'              => 'perro',
                'manufacturer'         => 'Genérico',
                'short_description'    => 'Vacuna antirrábica obligatoria según normativa local.',
                'description'          => 'Vacuna inactivada frente a virus rábico. Se administra habitualmente a partir de los 3 meses y luego con refuerzos periódicos según normativa.',
                'default_dose_ml'      => 1.0,
                'route'                => 'SC',
                'min_age_weeks'        => 12,
                'max_age_weeks'        => 999,
                'default_interval_days'=> 365,
                'is_core'              => true,
                'active'               => true,
                'extra_data'           => [
                    'code'          => 'CAN-RAB-1Y',
                    'validity_days' => 365,
                    'legal_note'    => 'Verificar reglamentación local sobre obligatoriedad y frecuencia.',
                ],
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            [
                'name'                 => 'Bordetella bronchiseptica (tos de las perreras)',
                'species'              => 'perro',
                'manufacturer'         => 'Genérico',
                'short_description'    => 'Prevención de tos de las perreras en perros de alto riesgo.',
                'description'          => 'Indicada en perros que asisten a guarderías, hoteles caninos, exposiciones o tienen alta socialización. Puede ser intranasal o subcutánea según presentación.',
                'default_dose_ml'      => 1.0,
                'route'                => 'IN',
                'min_age_weeks'        => 8,
                'max_age_weeks'        => 999,
                'default_interval_days'=> 365,
                'is_core'              => false,
                'active'               => true,
                'extra_data'           => [
                    'code'          => 'CAN-BB-IN',
                    'risk_group'    => 'Perros de guardería/hotel/peluquería.',
                ],
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            // 🐱 GATOS – CORE
            [
                'name'                 => 'Triple felina (RCP)',
                'species'              => 'gato',
                'manufacturer'         => 'Genérico',
                'short_description'    => 'Rinotraqueitis viral felina, calicivirus y panleucopenia.',
                'description'          => 'Vacuna básica felina para primovacunación y refuerzos. Considerada core en la mayoría de las guías de medicina felina.',
                'default_dose_ml'      => 1.0,
                'route'                => 'SC',
                'min_age_weeks'        => 8,
                'max_age_weeks'        => 999,
                'default_interval_days'=> 365,
                'is_core'              => true,
                'active'               => true,
                'extra_data'           => [
                    'code'          => 'FEL-TRIPLE',
                    'series_doses'  => 2,
                    'series_gap_days' => 21,
                    'validity_days' => 365,
                ],
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            [
                'name'                 => 'Leucemia felina (FeLV)',
                'species'              => 'gato',
                'manufacturer'         => 'Genérico',
                'short_description'    => 'Vacuna frente a virus de leucemia felina (FeLV).',
                'description'          => 'Recomendada en gatos con acceso al exterior o contacto con otros gatos de estado sanitario desconocido. Se suele combinar con test previo.',
                'default_dose_ml'      => 1.0,
                'route'                => 'SC',
                'min_age_weeks'        => 9,
                'max_age_weeks'        => 999,
                'default_interval_days'=> 365,
                'is_core'              => false,
                'active'               => true,
                'extra_data'           => [
                    'code'          => 'FEL-FELV',
                    'requires_test' => true,
                    'test_type'     => 'FeLV/FiV rápido',
                ],
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            [
                'name'                 => 'Rabia felina inactivada',
                'species'              => 'gato',
                'manufacturer'         => 'Genérico',
                'short_description'    => 'Vacuna antirrábica para gatos.',
                'description'          => 'Vacuna inactivada frente a virus rábico, indicada en gatos que viven en zonas endémicas o según normativa local.',
                'default_dose_ml'      => 1.0,
                'route'                => 'SC',
                'min_age_weeks'        => 12,
                'max_age_weeks'        => 999,
                'default_interval_days'=> 365,
                'is_core'              => true,
                'active'               => true,
                'extra_data'           => [
                    'code'          => 'FEL-RAB-1Y',
                    'validity_days' => 365,
                ],
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            // 🐦 AVES
            [
                'name'                 => 'Vacuna Newcastle + Bronquitis infecciosa',
                'species'              => 'ave',
                'manufacturer'         => 'Genérico',
                'short_description'    => 'Control de enfermedades respiratorias en aves de producción o de hobby.',
                'description'          => 'Vacuna utilizada en aves de corral o aves ornamentales según programa sanitario. Esquemas variables según tipo de explotación.',
                'default_dose_ml'      => 0.5,
                'route'                => 'IN',
                'min_age_weeks'        => 3,
                'max_age_weeks'        => 999,
                'default_interval_days'=> 180,
                'is_core'              => false,
                'active'               => true,
                'extra_data'           => [
                    'code'          => 'AVES-NB',
                    'notes'         => 'Adaptar pauta a producción o uso hobby.',
                ],
                'created_at'           => $now,
                'updated_at'           => $now,
            ],

            // 🐹 ROEDORES / OTROS PEQUEÑOS
            [
                'name'                 => 'Mixomatosis + Enfermedad hemorrágica vírica (conejos)',
                'species'              => 'otro',
                'manufacturer'         => 'Genérico',
                'short_description'    => 'Prevención de enfermedades víricas graves en conejos.',
                'description'          => 'Vacuna combinada para mixomatosis y enfermedad hemorrágica vírica en conejos de compañía.',
                'default_dose_ml'      => 1.0,
                'route'                => 'SC',
                'min_age_weeks'        => 5,
                'max_age_weeks'        => 999,
                'default_interval_days'=> 365,
                'is_core'              => false,
                'active'               => true,
                'extra_data'           => [
                    'code'          => 'CNJ-MIX-EHV',
                    'validity_days' => 365,
                ],
                'created_at'           => $now,
                'updated_at'           => $now,
            ],
        ];

        foreach ($records as $row) {
            $unique = [
                'name'    => $row['name'],
                'species' => $row['species'],
            ];

            $values = $row;
            unset($values['name'], $values['species']);

            Vaccine::updateOrCreate($unique, $values);
        }
    }
}
