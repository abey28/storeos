export async function onRequestPost({ request, env }) {
  try {
    const { key, data } = await request.json();
    if (!key) return Response.json({ error: 'missing key' }, { status: 400 });
    await env.STOREOS_KV.put(key, JSON.stringify(data));
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
