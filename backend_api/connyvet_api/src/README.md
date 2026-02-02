# Código frontend en backend (copia)

Esta carpeta `src/` es una **copia** del frontend React/TypeScript que vive en:

- **Origen único recomendado:** `front/connyvet-frontend/src/`

## Motivo

Si esta copia se usa para build, SSR o tooling desde el backend, debe mantenerse sincronizada manualmente con el front. En caso contrario, se recomienda **usar solo** `front/connyvet-frontend/` como fuente de verdad y eliminar esta carpeta para evitar desincronización y duplicación de mantenimiento.

## Recomendación

- **No editar** los archivos aquí para nuevas funcionalidades; hacerlo en `front/connyvet-frontend/src/`.
- Si no hay un uso activo de esta copia (build desde backend, etc.), considerar eliminar `backend_api/connyvet_api/src/` y referenciar únicamente el proyecto front.
