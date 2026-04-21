export async function onRequestGet({ request }) {
  const email = 
    request.headers.get('cf-access-authenticated-user-email') ||
    request.headers.get('Cf-Access-Authenticated-User-Email') ||
    null;

  const allHeaders = {};
  request.headers.forEach((value, key) => {
    if (key.toLowerCase().includes('cf-access') || key.toLowerCase().includes('cf-connecting')) {
      allHeaders[key] = value;
    }
  });

  return Response.json({ email, debug: allHeaders });
}