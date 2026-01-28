<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\ResourceCollection;

class TutorCollection extends ResourceCollection
{
    public function toArray($request): array
    {
        return [
            'data' => TutorResource::collection($this->collection),
            'meta' => [
                'current_page' => $this->currentPage(),
                'last_page'    => $this->lastPage(),
                'per_page'     => $this->perPage(),
                'total'        => $this->total(),
            ],
        ];
    }
}
