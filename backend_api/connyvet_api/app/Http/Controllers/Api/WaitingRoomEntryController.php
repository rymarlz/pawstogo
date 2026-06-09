<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWaitingRoomEntryRequest;
use App\Http\Requests\UpdateWaitingRoomEntryRequest;
use App\Http\Resources\WaitingRoomEntryResource;
use App\Models\WaitingRoomEntry;
use Illuminate\Http\Request;

class WaitingRoomEntryController extends Controller
{
    public function index(Request $request)
    {
        $query = WaitingRoomEntry::query()
            ->with(['patient', 'tutor', 'consultation']);

        $status = $request->query('status');
        if ($status && $status !== 'all') {
            if (str_contains((string) $status, ',')) {
                $statuses = array_filter(array_map('trim', explode(',', (string) $status)));
                $query->whereIn('status', $statuses);
            } else {
                $query->where('status', $status);
            }
        } elseif (!$request->boolean('include_history')) {
            $query->whereIn('status', [
                WaitingRoomEntry::STATUS_ESPERANDO,
                WaitingRoomEntry::STATUS_EN_ATENCION,
            ]);
        }

        if ($priority = $request->query('priority')) {
            $query->where('priority', $priority);
        }

        if ($patientId = $request->query('patient_id')) {
            $query->where('patient_id', $patientId);
        }

        if ($tutorId = $request->query('tutor_id')) {
            $query->where('tutor_id', $tutorId);
        }

        if ($request->boolean('attended_today')) {
            $query->where('status', WaitingRoomEntry::STATUS_ATENDIDO)
                ->whereDate('attended_at', now()->toDateString());
        }

        $perPage = (int) $request->query('per_page', 50);

        $paginator = $query
            ->orderByRaw("CASE WHEN priority = 'urgente' THEN 0 ELSE 1 END")
            ->orderBy('arrived_at')
            ->orderBy('id')
            ->paginate($perPage);

        return response()->json([
            'data' => WaitingRoomEntryResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function store(StoreWaitingRoomEntryRequest $request)
    {
        $data = $request->validated();
        $data['status'] = WaitingRoomEntry::STATUS_ESPERANDO;
        $data['priority'] = $data['priority'] ?? WaitingRoomEntry::PRIORITY_NORMAL;
        $data['arrived_at'] = now();
        $data['created_by'] = $request->user()?->id;

        $entry = WaitingRoomEntry::create($data);
        $entry->load(['patient', 'tutor', 'consultation']);

        return (new WaitingRoomEntryResource($entry))
            ->response()
            ->setStatusCode(201);
    }

    public function show(WaitingRoomEntry $waitingRoomEntry)
    {
        $waitingRoomEntry->load(['patient', 'tutor', 'consultation']);

        return new WaitingRoomEntryResource($waitingRoomEntry);
    }

    public function update(UpdateWaitingRoomEntryRequest $request, WaitingRoomEntry $waitingRoomEntry)
    {
        $data = $request->validated();

        if (isset($data['status'])) {
            $waitingRoomEntry->applyStatus($data['status']);
            unset($data['status']);
        }

        $waitingRoomEntry->fill($data);
        $waitingRoomEntry->save();
        $waitingRoomEntry->load(['patient', 'tutor', 'consultation']);

        return new WaitingRoomEntryResource($waitingRoomEntry);
    }

    public function destroy(WaitingRoomEntry $waitingRoomEntry)
    {
        $waitingRoomEntry->delete();

        return response()->json(null, 204);
    }

    public function start(WaitingRoomEntry $waitingRoomEntry)
    {
        $waitingRoomEntry->applyStatus(WaitingRoomEntry::STATUS_EN_ATENCION);
        $waitingRoomEntry->save();
        $waitingRoomEntry->load(['patient', 'tutor', 'consultation']);

        return new WaitingRoomEntryResource($waitingRoomEntry);
    }

    public function attend(WaitingRoomEntry $waitingRoomEntry)
    {
        $waitingRoomEntry->applyStatus(WaitingRoomEntry::STATUS_ATENDIDO);
        $waitingRoomEntry->save();
        $waitingRoomEntry->load(['patient', 'tutor', 'consultation']);

        return new WaitingRoomEntryResource($waitingRoomEntry);
    }

    public function cancel(WaitingRoomEntry $waitingRoomEntry)
    {
        $waitingRoomEntry->applyStatus(WaitingRoomEntry::STATUS_CANCELADO);
        $waitingRoomEntry->save();
        $waitingRoomEntry->load(['patient', 'tutor', 'consultation']);

        return new WaitingRoomEntryResource($waitingRoomEntry);
    }
}
