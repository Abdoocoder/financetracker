// Development Proxy Server for Flutter Web
// Run with: dart run dev_proxy.dart
// Proxies browser requests from localhost:33963 to two upstreams:
//   /api/*  → https://fajrak.com  (Next.js route handlers, e.g. alerts generation)
//   other   → Supabase            (auth, rest, storage)
// Realtime (wss://) is not proxied.

// Standalone CLI dev tool: console output is the intended output channel.
// ignore_for_file: avoid_print

import 'dart:io';

const String _supabaseUrl = 'https://ujwcvtpwsaidljecqbaa.supabase.co';
const String _webApiUrl = 'https://fajrak.com';
const int _proxyPort = 33964; // Proxy runs on this port
const int _flutterPort = 33963; // Flutter web runs on this port

void main(List<String> args) async {
  print('🚀 Starting Fajrak Development Proxy');
  print('   Supabase URL: $_supabaseUrl');
  print('   Web API URL:  $_webApiUrl  (for /api/*)');
  print('   Proxy Port: $_proxyPort');
  print('   Flutter Port: $_flutterPort');
  print('');

  // Create HTTP server
  final server = await HttpServer.bind(InternetAddress.loopbackIPv4, _proxyPort);
  print('✅ Proxy server listening on http://localhost:$_proxyPort');
  print('');

  await for (final request in server) {
    // Handle CORS preflight
    if (request.method == 'OPTIONS') {
      _addCorsHeaders(request);
      request.response.statusCode = HttpStatus.ok;
      await request.response.close();
      continue;
    }

    // Build target URL — /api/* belongs to the Next.js app, everything else is
    // Supabase. Supabase paths (/auth/v1, /rest/v1, /storage/v1) never start
    // with /api, so the split is unambiguous.
    final path = request.uri.path;
    final query = request.uri.query;
    final origin =
        path == '/api' || path.startsWith('/api/') ? _webApiUrl : _supabaseUrl;
    final targetUrl = '$origin$path${query.isNotEmpty ? '?$query' : ''}';

    print('📡 ${request.method} $path → '
        '${origin == _webApiUrl ? 'web' : 'supabase'}');

    try {
      // Create client request to the upstream
      final client = HttpClient();
      final clientRequest =
          await client.openUrl(request.method, Uri.parse(targetUrl));

      // Copy headers (except host). `origin`/`referer` describe the browser,
      // not the server-side hop we make — forwarding them would let the
      // upstream apply browser-origin policy to a request no browser sent.
      request.headers.forEach((name, values) {
        final lower = name.toLowerCase();
        if (lower != 'host' && lower != 'origin' && lower != 'referer') {
          clientRequest.headers.set(name, values.join(','));
        }
      });

      // Copy body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH', 'DELETE'].contains(request.method)) {
        // Use listen and add to pipe the body correctly
        await for (final chunk in request) {
          clientRequest.add(chunk);
        }
        await clientRequest.close();
      } else {
        await clientRequest.close();
      }

      // Get response from upstream
      final clientResponse = await clientRequest.done;

      // Copy response to client. Skip:
      //  - `content-encoding`/`content-length`: HttpClient auto-decompresses by
      //    default, so a copied length describes bytes we are not sending
      //    (silent truncation / hung responses).
      //  - `access-control-*`: the dev proxy owns CORS; an upstream header must
      //    not overwrite the one the browser validates.
      clientResponse.headers.forEach((name, values) {
        final lower = name.toLowerCase();
        if (['content-encoding', 'content-length', 'transfer-encoding']
            .contains(lower)) {
          return;
        }
        if (lower.startsWith('access-control-')) return;
        request.response.headers.set(name, values.join(','));
      });

      request.response.statusCode = clientResponse.statusCode;
      _addCorsHeaders(request);

      await clientResponse.pipe(request.response);
      client.close();
    } catch (e) {
      print('❌ Error proxying request: $e');
      request.response.statusCode = HttpStatus.badGateway;
      _addCorsHeaders(request);
      request.response.write('Proxy error: $e');
      await request.response.close();
    }
  }
}

/// Adds CORS headers for the Flutter dev server.
///
/// The origin must be concrete: the Fetch spec rejects
/// `Access-Control-Allow-Origin: *` on a credentialed request, and this proxy
/// also sets `Allow-Credentials: true` — the wildcard made every browser
/// response unusable. Echoing the caller keeps the pair legal; `Vary: Origin`
/// stops a cache from replaying one origin's response to another.
void _addCorsHeaders(HttpRequest request) {
  final response = request.response;
  final origin =
      request.headers.value('origin') ?? 'http://localhost:$_flutterPort';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Vary', 'Origin');
  response.headers.set(
      'Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers',
      'Content-Type, Authorization, apikey, x-client-info');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
}
