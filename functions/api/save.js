// POST /api/save — 寫入單一 KV key（v2.9.0 強化）
// 1. 白名單：僅允許核心資料 key，其他一律 400
// 2. 基本型別檢查：staff/records/projTypes 須為 Array；
//    shifts/insuranceBrackets 須為 object；tiers 接受 object（新格式）或 Array（舊前端過渡期相容）
// 3. 寫入成功後自動寫一筆稽核 log 至 KV `logs`（與前端 logAction 並存）

const ALLOWED_KEYS = ['staff', 'records', 'tiers', 'projTypes', 'shifts', 'insuranceBrackets'];
const ARRAY_KEYS = ['staff', 'records', 'projTypes'];
const OBJECT_KEYS = ['shifts', 'insuranceBrackets'];
const MAX_LOGS = 1000;

function getUserEmail(request) {
  return (
    request.headers.get('cf-access-authenticated-user-email') ||
    request.headers.get('Cf-Access-Authenticated-User-Email') ||
    null
  );
}

function describeData(data) {
  if (Array.isArray(data)) return data.length + ' 筆';
  if (data && typeof data === 'object') return Object.keys(data).length + ' 個欄位';
  return String(data).slice(0, 60);
}

export async function onRequestPost({ request, env }) {
  try {
    const { key, data } = await request.json();
    if (!key) return Response.json({ error: 'missing key' }, { status: 400 });
    if (!ALLOWED_KEYS.includes(key)) {
      return Response.json({ error: 'key not allowed: ' + key }, { status: 400 });
    }
    if (ARRAY_KEYS.includes(key) && !Array.isArray(data)) {
      return Response.json({ error: key + ' must be an array' }, { status: 400 });
    }
    if (OBJECT_KEYS.includes(key) && (data === null || typeof data !== 'object' || Array.isArray(data))) {
      return Response.json({ error: key + ' must be an object' }, { status: 400 });
    }
    if (key === 'tiers' && !(Array.isArray(data) || (data !== null && typeof data === 'object'))) {
      return Response.json({ error: 'tiers must be an object or array' }, { status: 400 });
    }
    await env.STOREOS_KV.put(key, JSON.stringify(data));

    // 自動稽核 log（失敗不影響主寫入）
    try {
      const entry = {
        ts: Date.now(),
        user: getUserEmail(request) || '訪客',
        action: 'API寫入:' + key,
        detail: describeData(data),
        ip: request.headers.get('cf-connecting-ip') || '',
      };
      const logs = (await env.STOREOS_KV.get('logs', 'json')) || [];
      logs.unshift(entry);
      if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
      await env.STOREOS_KV.put('logs', JSON.stringify(logs));
    } catch (e) {
      /* 稽核寫入失敗靜默略過 */
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
