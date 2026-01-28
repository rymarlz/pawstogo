<?php

namespace App\Policies;

use App\Models\Payment;
use App\Models\User;

class PaymentPolicy
{
    private function isCashier(User $user): bool
    {
        $role = $user->role ?? null;
        return in_array($role, ['admin', 'recepcion', 'vet'], true);
    }

    public function viewAny(User $user): bool
    {
        return $this->isCashier($user);
    }

    public function view(User $user, Payment $payment): bool
    {
        return $this->isCashier($user);
    }

    public function create(User $user): bool
    {
        return $this->isCashier($user);
    }

    public function update(User $user, Payment $payment): bool
    {
        if (in_array($payment->status, ['paid', 'cancelled'], true)) return false;
        return $this->isCashier($user);
    }

    public function markPaid(User $user, Payment $payment): bool
    {
        if ($payment->status !== 'pending') return false;
        return $this->isCashier($user);
    }

    public function cancel(User $user, Payment $payment): bool
    {
        if ($payment->status === 'cancelled') return false;
        $role = $user->role ?? null;
        if ($payment->status === 'paid' && $role !== 'admin') return false;
        return $this->isCashier($user);
    }

    public function delete(User $user, Payment $payment): bool
    {
        return $this->isCashier($user) && $payment->status === 'pending';
    }
}
