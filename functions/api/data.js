export async function onRequestGet({ env }) {
  try {
    const [staff, records, tiers, projTypes, shifts, insuranceBrackets] = await Promise.all([
      env.STOREOS_KV.get('staff', 'json'),
      env.STOREOS_KV.get('records', 'json'),
      env.STOREOS_KV.get('tiers', 'json'),
      env.STOREOS_KV.get('projTypes', 'json'),
      env.STOREOS_KV.get('shifts', 'json'),
      env.STOREOS_KV.get('insuranceBrackets', 'json'),
    ]);
    return Response.json({
      staff: staff || [],
      records: records || [],
      tiers: tiers || [
        { threshold: 5000, bonus: 200 },
        { threshold: 10000, bonus: 500 },
        { threshold: 14000, bonus: 700 },
      ],
      projTypes: projTypes || [],
      shifts: shifts || {
        台北車站: [{ name: '全天班', hours: 8, hourlyRate: 175 }],
        中山誠品: [{ name: '全天班', hours: 8, hourlyRate: 175 }],
        松菸誠品: [{ name: '全天班', hours: 8, hourlyRate: 175 }],
      },
      insuranceBrackets: insuranceBrackets || null,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
