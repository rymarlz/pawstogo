<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BudgetItem extends Model
{
  protected $fillable = [
    'budget_id','sort_order',
    'name','description',
    'qty','unit_price','discount','tax_rate',
    'line_subtotal','line_tax','line_total',
  ];

  protected $casts = [
    'qty' => 'decimal:2',
    'unit_price' => 'decimal:2',
    'discount' => 'decimal:2',
    'tax_rate' => 'decimal:2',
    'line_subtotal' => 'decimal:2',
    'line_tax' => 'decimal:2',
    'line_total' => 'decimal:2',
  ];

  public function budget()
  {
    return $this->belongsTo(Budget::class);
  }
}
