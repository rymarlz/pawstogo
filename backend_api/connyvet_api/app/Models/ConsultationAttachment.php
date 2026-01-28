<?php 
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationAttachment extends Model
{
  protected $fillable = [
    'consultation_id','name','original_name','path','mime','size','uploaded_by'
  ];

  public function consultation() {
    return $this->belongsTo(Consultation::class);
  }
}
