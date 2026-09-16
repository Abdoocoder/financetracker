// ignore_for_file: constant_identifier_names

enum ByokAuth { bearer, xApiKey, xGoogApiKey, none }

class ByokProvider {
  final String id;
  final String name;
  final String kind;
  final String baseUrl;
  final String defaultModel;
  final List<String> availableModels;
  final ByokAuth auth;
  final String authHeaderName;
  final Map<String, String> defaultHeaders;

  const ByokProvider({
    required this.id,
    required this.name,
    required this.kind,
    required this.baseUrl,
    required this.defaultModel,
    required this.availableModels,
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
    availableModels: ['gpt-5.4-mini', 'gpt-5.4', 'gpt-4.1', 'gpt-4.1-mini', 'o1-preview', 'o1-mini'],
    auth: ByokAuth.bearer,
    authHeaderName: 'authorization',
  ),
  'anthropic': ByokProvider(
    id: 'anthropic',
    name: 'Anthropic',
    kind: 'proxy',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-6',
    availableModels: ['claude-sonnet-4-6', 'claude-opus-4', 'claude-3.5-sonnet'],
    auth: ByokAuth.xApiKey,
    authHeaderName: 'x-api-key',
    defaultHeaders: {'anthropic-version': '2023-06-01'},
  ),
  'nvidia-nim': ByokProvider(
    id: 'nvidia-nim',
    name: 'NVIDIA NIM',
    kind: 'proxy',
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b',
    availableModels: [
      'nvidia/nemotron-3-ultra-550b-a55b',
      'nvidia/nemotron-3-super-120b-a12b',
      'meta/llama-3.1-70b-instruct',
      'meta/llama-3.1-405b-instruct',
      'mistralai/mistral-nemotron',
      'google/gemma-2-27b-it',
    ],
    auth: ByokAuth.bearer,
    authHeaderName: 'authorization',
  ),
  'openrouter': ByokProvider(
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'proxy',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'auto',
    availableModels: ['auto', 'openai/gpt-5.4-mini', 'anthropic/claude-sonnet-4-6', 'meta/llama-3.1-405b-instruct'],
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
    availableModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-1.5-pro'],
    auth: ByokAuth.xGoogApiKey,
    authHeaderName: 'x-goog-api-key',
  ),
  'ollama': ByokProvider(
    id: 'ollama',
    name: 'Ollama (Local Engine)',
    kind: 'clientDirect',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    availableModels: ['llama3.1', 'llama3.2', 'mistral', 'qwen2.5', 'phi3.5'],
    auth: ByokAuth.none,
    authHeaderName: '',
  ),
};

ByokProvider? getProvider(String id) => SUPPORTED_PROVIDERS[id];