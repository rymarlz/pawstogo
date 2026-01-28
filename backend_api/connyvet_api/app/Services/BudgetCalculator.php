<?php

namespace App\Services;

class BudgetCalculator
{
  public function compute(array $items): array
  {
    $subtotal = 0;
    $discountTotal = 0;
    $taxTotal = 0;
    $total = 0;

    $normalized = array_map(function ($it) use (&$subtotal, &$discountTotal, &$taxTotal, &$total) {
      $qty = (float)($it['qty'] ?? 1);
      $unit = (float)($it['unit_price'] ?? 0);
      $discount = (float)($it['discount'] ?? 0);
      $taxRate = (float)($it['tax_rate'] ?? 0);

      $lineSubtotal = max(0, ($qty * $unit) - $discount);
      $lineTax = $lineSubtotal * ($taxRate / 100);
      $lineTotal = $lineSubtotal + $lineTax;

      $subtotal += $lineSubtotal;
      $discountTotal += $discount;
      $taxTotal += $lineTax;
      $total += $lineTotal;

      $it['line_subtotal'] = round($lineSubtotal, 2);
      $it['line_tax'] = round($lineTax, 2);
      $it['line_total'] = round($lineTotal, 2);

      return $it;
    }, $items);

    return [
      'items' => $normalized,
      'subtotal' => round($subtotal, 2),
      'discount_total' => round($discountTotal, 2),
      'tax_total' => round($taxTotal, 2),
      'total' => round($total, 2),
    ];
  }
}
