<?php

namespace App\Providers;

use App\Models\Budget;
use App\Models\Payment;
use App\Models\PaymentIntent;
use App\Policies\BudgetPolicy;
use App\Policies\PaymentIntentPolicy;
use App\Policies\PaymentPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Budget::class        => BudgetPolicy::class,
        Payment::class       => PaymentPolicy::class,
        PaymentIntent::class => PaymentIntentPolicy::class,
    ];


    public function boot(): void
    {
        $this->registerPolicies();
    }
}
