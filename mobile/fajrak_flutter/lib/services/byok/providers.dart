// ignore_for_file: constant_identifier_names

enum ByokAuth { bearer, xApiKey, xGoogApiKey, none }

class ByokProvider {
  final String id;
  final String name;
  final String kind;
  final String baseUrl;
  final String defaultModel;
  final ByokAuth auth;
  final String authHeaderName;
  final Map<String, String> defaultHeaders;

  const ByokProvider({
    required this.id,
    required this.name,
    required this.kind,
    required this.baseUrl,
    required this.defaultModel,
    required this.auth,
    required this.authHeaderName,
    this.defaultHeaders = const {},
  });

  bool get isClientDirect => kind == 'clientDirect';
}

const SUPPORTED_PROVIDERS = <String, ByokProvider>{
  'openai': ByokProvider(
    id: 'openai',
    name: 'OpenAI',
    kind: 'proxy',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-5.4-mini',
    auth: ByokAuth.bearer,
    authHeaderName: 'authorization',
  ),
  'anthropic': ByokProvider(
    id: 'anthropic',
    name: 'Anthropic',
    kind: 'proxy',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-6',
    auth: ByokAuth.xApiKey,
    authHeaderName: 'x-api-key',
    defaultHeaders: {'anthropic-version': '2023-06-01'},
  ),
  'nvidia-nim': ByokProvider(
    id: 'nvidia-nim',
    name: 'NVIDIA NIM',
    kind: 'proxy',
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    defaultModel: 'meta/llama-3.1-70b-instruct',
    auth: ByokAuth.bearer,
    authHeaderName: 'authorization',
  ),
  'openrouter': ByokProvider(
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'proxy',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'auto',
    auth: ByokAuth.bearer,
    authHeaderName: 'authorization',
  ),
  'gemini': ByokProvider(
    id: 'gemini',
    name: 'Gemini',
    kind: 'proxy',
    baseUrl:
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    defaultModel: 'gemini-2.5-pro',
    auth: ByokAuth.xGoogApiKey,
    authHeaderName: 'x-goog-api-key',
  ),
  'ollama': ByokProvider(
    id: 'ollama',
    name: 'Ollama (Local Engine)',
    kind: 'clientDirect',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    auth: ByokAuth.none,
    authHeaderName: '',
  ),
};

ByokProvider? getProvider(String id) => SUPPORTED_PROVIDERS[id];