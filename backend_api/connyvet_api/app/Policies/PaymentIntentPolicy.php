<?php

namespace App\Policies;

use App\Models\PaymentIntent;
use App\Models\User;

/**
 * Misma lógica de roles que PaymentPolicy: solo admin, doctor y asistente
 * pueden gestionar intenciones de pago (listar, crear, ver, iniciar, cancelar).
 */
class PaymentIntentPolicy
{
    private function canManagePaymentIntents(User $user): bool
    {
        $role = $user->role ?? null;

        return in_array($role, ['admin', 'doctor', 'asistente'], true);
    }

    public function viewAny(User $user): bool
    {
        return $this->canManagePaymentIntents($user);
    }

    public function view(User $user, PaymentIntent $paymentIntent): bool
    {
        return $this->canManagePaymentIntents($user);
    }

    public function create(User $user): bool
    {
        return $this->canManagePaymentIntents($user);
    }
}
