<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\ConsultationAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class ConsultationAttachmentController extends Controller
{
    public function store(Request $request, Consultation $consultation)
    {
        $request->validate([
            'files' => ['required', 'array', 'min:1'],
            'files.*' => ['file', 'max:20480'],
            'details' => ['required', 'array'],
            'details.*' => ['required', 'string', 'max:120'],
        ]);

        $files = $request->file('files', []);
        $details = $request->input('details', []);

        if (count($files) !== count($details)) {
            return response()->json(['message' => 'details[] debe coincidir con files[]'], 422);
        }

        $created = [];

        foreach ($files as $i => $file) {
            $name = trim((string) ($details[$i] ?? ''));
            if ($name === '') {
                return response()->json(['message' => 'Nombre/detalle es obligatorio por archivo'], 422);
            }

            $dir = "consultations/{$consultation->id}";
            $path = $file->store($dir, 'public');

            $att = ConsultationAttachment::create([
                'consultation_id' => $consultation->id,
                'name' => $name,
                'original_name' => $file->getClientOriginalName(),
                'path' => $path,
                'mime' => $file->getMimeType(),
                'size' => $file->getSize() ?? 0,
                'uploaded_by' => Auth::id(),
            ]);

            $created[] = [
                'id' => $att->id,
                'name' => $att->name,
                'original_name' => $att->original_name,
                'size' => $att->size,
                'download_url' => "/api/v1/consultations/{$consultation->id}/attachments/{$att->id}/download",
            ];
        }

        return response()->json(['data' => $created], 201);
    }

    public function download(Consultation $consultation, ConsultationAttachment $attachment)
    {
        if ($attachment->consultation_id !== $consultation->id) {
            return response()->json(['message' => 'Archivo no pertenece a la consulta'], 404);
        }

        if (!Storage::disk('public')->exists($attachment->path)) {
            return response()->json(['message' => 'Archivo no encontrado'], 404);
        }

        $fullPath = Storage::disk('public')->path($attachment->path);

        return response()->download($fullPath, $attachment->original_name, [
            'Content-Type' => $attachment->mime ?? 'application/octet-stream',
        ]);
    }
}
