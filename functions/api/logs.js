// 操作紀錄 API
// GET  /api/logs?limit=200  → 取得最近 N 筆操作紀錄（預設 300，最多 1000）
// POST /api/logs            → 新增一筆操作紀錄 { action, detail? }
// 儲存於 KV 的 'logs' 鍵，為陣列（最新在前），最多保留 MAX_LOGS 筆。

const MAX_LOGS = 1000;

function getUserEmail(request) {
  return (
    request.headers.get('cf-access-authenticated-user-email') ||
    request.headers.get('Cf-Access-Authenticated-User-Email') ||
    null
  );
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || '300', 10) || 300, 1),
      MAX_LOGS,
    );
    const logs = (await env.STOREOS_KV.get('logs', 'json')) || [];
    return Response.json({ logs: logs.slice(0, limit), total: logs.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const action = (body.action || '').toString().slice(0, 60);
    if (!action) {
      return Response.json({ error: 'missing action' }, { status: 400 });
    }
    const email = getUserEmail(request) || body.user || '訪客';
    const entry = {
      ts: Date.now(),
      user: email,
      action,
      detail: (body.detail || '').toString().slice(0, 400),
      ip: request.headers.get('cf-connecting-ip') || '',
    };
    const existing = (await env.STOREOS_KV.get('logs', 'json')) || [];
    existing.unshift(entry);
    if (existing.length > MAX_LOGS) existing.length = MAX_LOGS;
    await env.STOREOS_KV.put('logs', JSON.stringify(existing));
    return Response.json({ ok: true, entry });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
