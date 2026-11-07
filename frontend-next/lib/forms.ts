export type FormResult = { ok: boolean; message: string };

export async function submitForm(
  form: Record<string, string>,
  endpoint = process.env.NEXT_PUBLIC_FORMS_ENDPOINT,
): Promise<FormResult> {
  if (!endpoint) return { ok: true, message: 'Demo mode, nothing was sent.' };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form),
  });
  if (!response.ok) throw new Error(`Form submission failed (${response.status}).`);
  return { ok: true, message: 'Thanks. We received your message.' };
}
