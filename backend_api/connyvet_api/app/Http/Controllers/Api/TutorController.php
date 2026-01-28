<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTutorRequest;
use App\Http\Requests\UpdateTutorRequest;
use App\Http\Resources\TutorCollection;
use App\Http\Resources\TutorResource;
use App\Models\Tutor;
use Illuminate\Http\Request;

class TutorController extends Controller
{
public function index(Request $request)
{
    $search  = trim($request->input('search', ''));
    $perPage = $request->integer('per_page', 15);

    $q = Tutor::query();

    if ($search !== '') {
        $q->where(function($qq) use ($search) {
            $like = "%{$search}%";
            $qq->where('nombres', 'like', $like)
               ->orWhere('apellidos', 'like', $like)
               ->orWhere('email', 'like', $like)
               ->orWhere('rut', 'like', $like);
        });
    }

    $tutores = $q->orderByDesc('id')->paginate($perPage)->withQueryString();

    return new TutorCollection($tutores);
}

    public function store(StoreTutorRequest $request)
    {
        $tutor = Tutor::create($request->validated());
        return (new TutorResource($tutor))
            ->additional(['message' => 'Tutor creado'])
            ->response()
            ->setStatusCode(201);
    }

    public function show(Tutor $tutor)
    {
        return new TutorResource($tutor);
    }

    public function update(UpdateTutorRequest $request, Tutor $tutor)
    {
        $tutor->update($request->validated());
        return (new TutorResource($tutor))
            ->additional(['message' => 'Tutor actualizado']);
    }

    public function destroy(Tutor $tutor)
    {
        $tutor->delete();
        return response()->json(['message' => 'Tutor eliminado']);
    }
}
