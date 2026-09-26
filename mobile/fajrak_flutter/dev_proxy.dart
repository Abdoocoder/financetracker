// Development Proxy Server for Flutter Web
// Run with: dart run dev_proxy.dart
// This proxies requests from localhost:33963 to Supabase to avoid CORS issues

import 'dart:io';

void main(List<String> args) async {
  // Configuration
  const supabaseUrl = 'https://ujwcvtpwsaidljecqbaa.supabase.co';
  const proxyPort = 33964; // Proxy runs on this port
  const flutterPort = 33963; // Flutter web runs on this port

  print('🚀 Starting Fajrak Development Proxy');
  print('   Supabase URL: $supabaseUrl');
  print('   Proxy Port: $proxyPort');
  print('   Flutter Port: $flutterPort');
  print('');

  // Create HTTP server
  final server = await HttpServer.bind(InternetAddress.loopbackIPv4, proxyPort);
  print('✅ Proxy server listening on http://localhost:$proxyPort');
  print('');

  await for (final request in server) {
    // Handle CORS preflight
    if (request.method == 'OPTIONS') {
      _addCorsHeaders(request.response);
      request.response.statusCode = HttpStatus.ok;
      await request.response.close();
      continue;
    }

    // Build target URL
    final path = request.uri.path;
    final query = request.uri.query;
    final targetUrl = '$supabaseUrl$path${query.isNotEmpty ? '?$query' : ''}';

    print('📡 ${request.method} $path');

    try {
      // Create client request to Supabase
      final client = HttpClient();
      final clientRequest = await client.openUrl(request.method, Uri.parse(targetUrl));

      // Copy headers (except host)
      request.headers.forEach((name, values) {
        if (name.toLowerCase() != 'host') {
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

      // Get response from Supabase
      final clientResponse = await clientRequest.done;

      // Copy response to client
      request.response.statusCode = clientResponse.statusCode;
      _addCorsHeaders(request.response);
      
      clientResponse.headers.forEach((name, values) {
        // Don't copy these headers
        if (!['content-encoding', 'transfer-encoding'].contains(name.toLowerCase())) {
          request.response.headers.set(name, values.join(','));
        }
      });

      await clientResponse.pipe(request.response);
      client.close();
    } catch (e) {
      print('❌ Error proxying request: $e');
      request.response.statusCode = HttpStatus.badGateway;
      _addCorsHeaders(request.response);
      request.response.write('Proxy error: $e');
      await request.response.close();
    }
  }
}

void _addCorsHeaders(HttpResponse response) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, x-client-info');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
}