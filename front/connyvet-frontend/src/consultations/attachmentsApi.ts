import { API_BASE_URL, joinUrl } from '../api';

function isRealFile(v: any): v is File {
  return (
    v instanceof File ||
    (v &&
      typeof v === 'object' &&
      typeof v.name === 'string' &&
      typeof v.size === 'number' &&
      typeof v.type === 'string' &&
      typeof v.arrayBuffer === 'function')
  );
}

export async function uploadConsultationAttachments(
  token: string,
  consultationId: number,
  items: { file: any; detail: string }[],
) {
  const bad = items.findIndex((x) => !isRealFile(x?.file));
  if (bad >= 0) {
    throw new Error(`Adjunto inválido: items[${bad}].file NO es File real`);
  }

  const fd = new FormData();
  items.forEach((a, idx) => {
    const label = (a.detail || a.file.name || `Archivo ${idx + 1}`).trim();
    fd.append('files[]', a.file, a.file.name);
    fd.append('notes[]', label);
  });

  const url = joinUrl(API_BASE_URL, `/consultations/${consultationId}/attachments`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      // ❌ NO Content-Type
    },
    body: fd,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}
