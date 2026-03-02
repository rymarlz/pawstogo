<?php

use App\Models\Patient;
use App\Models\VaccineApplication;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('db:wipe-except-tutors-patients', function () {
    $keep = ['tutors', 'patients'];
    $driver = DB::getDriverName();

    if ($driver === 'mysql') {
        $tables = collect(DB::select('SHOW TABLES'))
            ->map(fn ($row) => array_values((array) $row)[0])
            ->filter(fn ($table) => ! in_array($table, $keep, true))
            ->values()
            ->all();
    } else {
        $tables = collect(DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
            ->pluck('name')
            ->filter(fn ($table) => ! in_array($table, $keep, true))
            ->values()
            ->all();
    }

    if (empty($tables)) {
        $this->info('No hay tablas que borrar (solo se conservan tutors y patients).');
        return;
    }

    $this->warn('Se vaciarán estas tablas: ' . implode(', ', $tables));

    if ($driver === 'mysql') {
        DB::statement('SET FOREIGN_KEY_CHECKS = 0');
    }

    foreach ($tables as $table) {
        if (! Schema::hasTable($table)) {
            continue;
        }
        DB::table($table)->truncate();
        $this->line("  Truncada: {$table}");
    }

    if ($driver === 'mysql') {
        DB::statement('SET FOREIGN_KEY_CHECKS = 1');
    }

    $this->info('Listo. Solo se conservaron los datos de tutors y patients.');
})->purpose('Vaciar todas las tablas de la BD excepto tutors y patients');

/**
 * Backfill: reparar vaccine_applications con tutor_id null.
 * Asigna tutor_id = patient.tutor_id para cada registro afectado.
 *
 * Uso: php artisan vaccine-applications:backfill-tutor-id
 */
Artisan::command('vaccine-applications:backfill-tutor-id', function () {
    $affected = VaccineApplication::query()
        ->whereNull('tutor_id')
        ->whereNotNull('patient_id')
        ->get();

    $updated = 0;
    $skipped = 0;

    foreach ($affected as $app) {
        $patient = Patient::find($app->patient_id);
        if (! $patient || ! $patient->tutor_id) {
            $this->warn("  Saltado: vaccine_application id={$app->id}, patient_id={$app->patient_id} (paciente sin tutor_id)");
            $skipped++;
            continue;
        }
        $app->update(['tutor_id' => $patient->tutor_id]);
        $updated++;
    }

    $this->info("Reparados: {$updated}. Saltados (sin tutor): {$skipped}. Total procesados: " . $affected->count());
})->purpose('Asignar tutor_id en vaccine_applications que lo tienen null, usando patient.tutor_id');
