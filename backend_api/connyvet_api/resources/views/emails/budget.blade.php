<p>Hola,</p>

<p>Adjuntamos el presupuesto <strong>{{ $budget->code }}</strong>.</p>

@if($customMessage)
  <p><strong>Mensaje:</strong><br>{!! nl2br(e($customMessage)) !!}</p>
@endif

<p>Saludos.<br>ConnyVet</p>
