<?php

use Illuminate\Support\Facades\Route;

// ==== Controllers ====
use App\Http\Controllers\AuthController;

use App\Http\Controllers\Api\TutorController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\ClinicalRecordController;
use App\Http\Controllers\Api\ConsultationController;
use App\Http\Controllers\Api\HospitalizationController;
use App\Http\Controllers\Api\VaccineController;
use App\Http\Controllers\Api\VaccineApplicationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\BudgetController;

use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\PaymentIntentController;
use App\Http\Controllers\Api\V1\MercadoPagoWebhookController;

// Models (para policies opcionales)
use App\Models\Payment;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| Base: /api
| Versionadas: /api/v1/...
| Protegidas: auth:sanctum
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->as('api.v1.')->group(function () {

    // =========================
    // Status / Info
    // =========================
    Route::get('/', function () {
        return response()->json([
            'name'    => config('app.name'),
            'version' => app()->version(),
            'php'     => PHP_VERSION,
            'time'    => now()->toIso8601String(),
        ]);
    })->name('root');

    Route::get('/ping', function () {
        return response()->json([
            'ok'   => true,
            'app'  => config('app.name'),
            'env'  => config('app.env'),
            'time' => now()->toIso8601String(),
        ], 200);
    })->name('ping');

    // =========================
    // Auth (público)
    // =========================
    Route::prefix('auth')->as('auth.')->group(function () {
        Route::post('/login',  [AuthController::class, 'login'])->name('login');
        // Route::post('/register', [AuthController::class, 'register'])->name('register');
    });

    // =========================================================
    // ✅ PDFs (FUERA del group protegido)
    // - Se consumen con ?token=... (sanctum.query)
    // =========================================================

    // ---- PDF Presupuesto ----
    Route::get('budgets/{budget}/pdf', [BudgetController::class, 'pdf'])
        ->middleware(['sanctum.query', 'throttle:60,1'])
        ->name('budgets.pdf');

    // ---- PDFs Consulta: receta / examenes / completo ----
    Route::get('consultations/{consultation}/pdf/rx', [ConsultationController::class, 'pdfRx'])
        ->middleware(['sanctum.query', 'throttle:60,1'])
        ->name('consultations.pdf.rx');

    Route::get('consultations/{consultation}/pdf/exams', [ConsultationController::class, 'pdfExams'])
        ->middleware(['sanctum.query', 'throttle:60,1'])
        ->name('consultations.pdf.exams');

    Route::get('consultations/{consultation}/pdf/clinical', [ConsultationController::class, 'pdfClinical'])
        ->middleware(['sanctum.query', 'throttle:60,1'])
        ->name('consultations.pdf.clinical');

    // =========================
    // Rutas protegidas
    // =========================
    Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {

        // ----- Auth protegido -----
        Route::prefix('auth')->as('auth.')->group(function () {
            Route::get('/me',     [AuthController::class, 'me'])->name('me');
            Route::post('/logout',[AuthController::class, 'logout'])->name('logout');
        });

        // =========================
        // Tutores
        // =========================
        Route::apiResource('tutores', TutorController::class)
            ->parameters(['tutores' => 'tutor'])
            ->names('tutores');

        // =========================
        // Pacientes
        // =========================
        Route::apiResource('patients', PatientController::class)
            ->parameters(['patients' => 'patient'])
            ->names('patients');

        // Ficha clínica consolidada de un paciente
        Route::get('patients/{patient}/clinical-record', [ClinicalRecordController::class, 'show'])
            ->name('patients.clinical_record.show');

        // =========================
        // Consultas
        // =========================
        Route::post('consultations/{consultation}/attachments', [ConsultationController::class, 'uploadAttachments'])
            ->name('consultations.attachments.upload');

        Route::delete('consultations/{consultation}/attachments/{index}', [ConsultationController::class, 'deleteAttachment'])
            ->whereNumber('index')
            ->name('consultations.attachments.delete');

        Route::apiResource('consultations', ConsultationController::class)
            ->parameters(['consultations' => 'consultation'])
            ->names('consultations');

        // =========================
        // Hospitalizaciones
        // =========================
        Route::apiResource('hospitalizations', HospitalizationController::class)
            ->parameters(['hospitalizations' => 'hospitalization'])
            ->names('hospitalizations');

        // =========================
        // Vacunas (catálogo)
        // =========================
        Route::apiResource('vaccines', VaccineController::class)
            ->parameters(['vaccines' => 'vaccine'])
            ->names('vaccines');

        // =========================
        // Aplicaciones de vacunas (agenda)
        // =========================
        Route::apiResource('vaccine-applications', VaccineApplicationController::class)
            ->parameters(['vaccine-applications' => 'vaccineApplication'])
            ->names('vaccine_applications');

        Route::get('dashboard/vaccines/upcoming', [VaccineApplicationController::class, 'upcomingForDashboard'])
            ->name('dashboard.vaccines.upcoming');

        // =========================
        // ADMIN (solo admin)
        // =========================
        Route::middleware('admin')->prefix('admin')->as('admin.')->group(function () {
            Route::apiResource('users', AdminUserController::class)->names('users');
        });

        // =========================
        // PAGOS
        // =========================
        Route::get('payments/summary', [PaymentController::class, 'summary'])
            ->name('payments.summary')
            ->middleware('can:viewAny,' . Payment::class);

        Route::apiResource('payments', PaymentController::class)
            ->names('payments')
            ->middleware('can:viewAny,' . Payment::class);

        Route::post('payments/{payment}/mark-paid', [PaymentController::class, 'markPaid'])
            ->name('payments.mark_paid')
            ->middleware('can:update,payment');

        Route::post('payments/{payment}/cancel', [PaymentController::class, 'cancel'])
            ->name('payments.cancel')
            ->middleware('can:update,payment');

        // Descarga adjuntos de consulta (con ?token=... igual que PDFs)
        Route::get('consultations/{consultation}/attachments/{index}/download', [ConsultationController::class, 'downloadAttachment'])
            ->middleware(['sanctum.query', 'throttle:60,1'])
            ->name('consultations.attachments.download');

        // =========================
        // PRESUPUESTOS (BUDGETS)
        // =========================
        Route::apiResource('budgets', BudgetController::class)
            ->parameters(['budgets' => 'budget'])
            ->names('budgets');

        Route::post('budgets/{budget}/send-email', [BudgetController::class, 'sendEmail'])
            ->name('budgets.send_email');

        // =========================
        // PAYMENT INTENTS (v1)
        // =========================
        Route::prefix('payment-intents')->as('payment_intents.')->group(function () {
            Route::get('/', [PaymentIntentController::class, 'index'])->name('index');
            Route::post('/', [PaymentIntentController::class, 'store'])->name('store');
            Route::get('/{id}', [PaymentIntentController::class, 'show'])->name('show');
            Route::post('/{id}/start', [PaymentIntentController::class, 'start'])->name('start');
            Route::post('/{id}/mark-manual-paid', [PaymentIntentController::class, 'markManualPaid'])->name('mark_manual_paid');
            Route::post('/{id}/cancel', [PaymentIntentController::class, 'cancel'])->name('cancel');
        });
    });
});

// =========================================================
// WEBHOOKS Y CALLBACKS PÚBLICOS (sin autenticación)
// =========================================================
Route::prefix('v1/payment-intents')->as('api.v1.payment_intents.')->group(function () {
    // MercadoPago webhook (POST desde MercadoPago)
    Route::post('{id}/mercadopago/webhook', [MercadoPagoWebhookController::class, 'webhook'])
        ->name('mercadopago.webhook')
        ->middleware('throttle:120,1'); // Rate limit más alto para webhooks
    
    // MercadoPago callback (GET cuando el usuario retorna)
    Route::get('{id}/mercadopago/callback', [MercadoPagoWebhookController::class, 'callback'])
        ->name('mercadopago.callback')
        ->middleware('throttle:60,1');
});

// =========================================================
// CORS preflight explícito
// =========================================================
Route::options('/{any}', function () {
    return response()->noContent(204);
})->where('any', '.*');

// =========================================================
// Fallback global API
// =========================================================
Route::fallback(function () {
    return response()->json([
        'message' => 'Recurso no encontrado',
    ], 404);
});
