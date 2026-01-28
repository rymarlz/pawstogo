<?php

namespace App\Providers;

use App\Models\Payment;
use App\Policies\PaymentPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
   protected $policies = [
  \App\Models\Budget::class => \App\Policies\BudgetPolicy::class,
];


    public function boot(): void
    {
        $this->registerPolicies();
    }
}
