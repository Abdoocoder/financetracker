// ignore_for_file: constant_identifier_names

enum ByokAuth { bearer, xApiKey, xGoogApiKey, none }

class ByokProvider {
  final String id;
  final String name;
  final String kind;
  final String baseUrl;
  final String defaultModel;
  final List<String> availableModels;
  final List<String> freeModels;
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
    this.freeModels = const [],
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
    defaultModel: 'gpt-4o',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
    auth: ByokAuth.bearer,
    authHeaderName: 'authorization',
  ),
  'anthropic': ByokProvider(
    id: 'anthropic',
    name: 'Anthropic',
    kind: 'proxy',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-sonnet-20241022',
    availableModels: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    auth: ByokAuth.xApiKey,
    authHeaderName: 'x-api-key',
    defaultHeaders: {'anthropic-version': '2023-06-01'},
  ),
  // Catalogue verified against the LIVE https://integrate.api.nvidia.com/v1/models
  // list on 2026-10-29. The three previous entries (meta/llama-3.1-8b-instruct,
  // meta/llama-3.1-70b-instruct, mistralai/mixtral-8x7b-instruct-v0.1) are
  // retired: llama-3.1-8b answers HTTP 410 (end of life 2026-08-26) and none of
  // them appear upstream, so every chat attempt failed. Keep this list in sync
  // with lib/byok/providers.ts on the web side.
  'nvidia-nim': ByokProvider(
    id: 'nvidia-nim',
    name: 'NVIDIA NIM',
    kind: 'proxy',
    baseUrl: 'https://integrate.api.nvidia.com/v1/chat/completions',
    defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b',
    availableModels: [
      'nvidia/nemotron-3-super-120b-a12b',
      'nvidia/nemotron-3-ultra-550b-a55b',
      'nvidia/nemotron-3.5-lightning-30b-a3b',
      'nvidia/nemotron-3.5-bolt-e4b',
      'nvidia/nemotron-nano-3-30b-a3b',
      'openai/gpt-oss-20b',
      'deepseek-ai/deepseek-v4.1-flash',
      'moonshotai/kimi-k2.6',
      'z-ai/glm-5.3-flash',
      'mistralai/mistral-large',
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'google/gemma-4-31b-it',
    ],
    auth: ByokAuth.bearer,
    authHeaderName: 'authorization',
  ),
  'openrouter': ByokProvider(
    id: 'openrouter',
    name: 'OpenRouter',
    kind: 'proxy',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'openai/gpt-4o-mini',
    availableModels: ['openai/gpt-4o-mini', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-8b-instruct'],
    freeModels: ['meta-llama/llama-3.1-8b-instruct', 'openai/gpt-4o-mini'],
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
    availableModels: ['gemini-2.5-pro', 'gemini-2.5-flash'],
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