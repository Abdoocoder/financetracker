import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/accounts_service.dart';
import '../../services/byok/byok_service.dart';
import '../../services/byok/chat.dart';
import '../../services/byok/envelope.dart';
import '../../services/byok/providers.dart';
import '../../services/byok/prompt_rules.dart';
import '../../services/currency_service.dart';
import '../../services/finance_service.dart';
import '../../screens/settings/settings_screen.dart';
import '../../utils/error_handler.dart';
import 'message_bubble.dart';

class ChatKeyRow {
  final String id;
  final String providerId;
  final String keyName;

  const ChatKeyRow({
    required this.id,
    required this.providerId,
    required this.keyName,
  });
}

class ChatFinancialData {
  final double totalBalance;
  final double income;
  final double expenses;
  final String currency;

  const ChatFinancialData({
    this.totalBalance = 0,
    this.income = 0,
    this.expenses = 0,
    this.currency = 'JOD',
  });
}

class ChatScreen extends StatefulWidget {
  final ByokService? service;
  final Future<List<ChatKeyRow>> Function()? keysLoader;
  final Future<ChatFinancialData?> Function()? contextLoader;

  const ChatScreen({
    super.key,
    this.service,
    this.keysLoader,
    this.contextLoader,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  static SupabaseClient get _db => Supabase.instance.client;

  late final ByokService _service = widget.service ?? ByokService();

  final TextEditingController _inputController = TextEditingController();
  final FocusNode _inputFocus = FocusNode();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMsg> _messages = [];

  String _providerId = 'ollama';
  String? _keyId;
  List<ChatKeyRow> _byokKeys = const [];
  bool _sending = false;
  bool _stopRequested = false;
  String _assistantPartial = '';
  String? _errorKey;
  String? _noticeKey;
  String? _traceTool;
  Map<String, dynamic>? _pendingConfirmation;
  final Set<String> _completedTools = <String>{};
  bool _loadingKeys = true;
  bool _loadingContext = true;
  bool _atBottom = true;
  String _selectedModel = '';

  double _totalBalance = 0;
  double _income = 0;
  double _expenses = 0;
  String _currency = 'JOD';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      final atBottom = _scrollController.offset <= 24.0;
      if (atBottom != _atBottom) {
        setState(() => _atBottom = atBottom);
      }
    });
    _load();
  }

  @override
  void dispose() {
    _inputController.dispose();
    _inputFocus.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  // ---------------------------------------------------------------------------
  // بيانات التحميل
  // ---------------------------------------------------------------------------

  Future<List<ChatKeyRow>> _defaultKeysLoader() async {
    final user = _db.auth.currentUser;
    if (user == null) return const [];
    final rows = await _db
        .from('user_byok_keys')
        .select('id, provider_id, key_name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', ascending: false);
    return rows.map<ChatKeyRow>((r) {
      return ChatKeyRow(
        id: (r['id'] as String),
        providerId: (r['provider_id'] as String?) ?? '',
        keyName: (r['key_name'] as String?) ?? '',
      );
    }).toList();
  }

  Future<ChatFinancialData?> _defaultContextLoader() async {
    double total = 0;
    String currency = 'JOD';
    try {
      final profile = await _db
          .from('profiles')
          .select('currency')
          .maybeSingle();
      if (profile != null) {
        final c = profile['currency'] as String?;
        if (c != null && c.isNotEmpty) currency = c;
      }
      final accounts = await AccountsService.fetchAccounts();
      total = accounts.fold<double>(
        0,
        (sum, a) => sum + ((a['balance'] as num?)?.toDouble() ?? 0),
      );
    } catch (_) {}

    double income = 0;
    double expenses = 0;
    try {
      final now = DateTime.now();
      final summary = await FinanceService.fetchMonthlyFinancialSummary(
        year: now.year,
        month: now.month,
      );
      income = (summary['income'] as num?)?.toDouble() ?? 0;
      expenses = (summary['expenses'] as num?)?.toDouble() ?? 0;
    } catch (_) {}

    return ChatFinancialData(
      totalBalance: total,
      income: income,
      expenses: expenses,
      currency: currency,
    );
  }

  Future<void> _load() async {
    try {
      final keys = await (widget.keysLoader ?? _defaultKeysLoader)();
      ChatFinancialData? contextData;
      try {
        contextData = await (widget.contextLoader ?? _defaultContextLoader)();
      } catch (e) {
        if (!mounted) return;
        ErrorHandler.handle(e,
            context: context, developerMessage: 'Chat context load');
      }
      if (!mounted) return;
      setState(() {
        _byokKeys = keys;
        _loadingKeys = false;
        _loadingContext = false;
        if (contextData != null) {
          _totalBalance = contextData.totalBalance;
          _income = contextData.income;
          _expenses = contextData.expenses;
          _currency = contextData.currency.isEmpty ? 'JOD' : contextData.currency;
        }
      });
      _syncKeySelection();
    } catch (e) {
      ErrorHandler.handle(e,
          context: context, developerMessage: 'Chat keys load');
      if (!mounted) return;
      setState(() {
        _loadingKeys = false;
        _loadingContext = false;
      });
    }
  }

  /// يُفرّغ [keyId] إذا كان لا ينتمي إلى مفاتيح المزوّد الحالي
  void _syncKeySelection() {
    final providerKeys = _byokKeys
        .where((k) => k.providerId == _providerId)
        .toList();
    final stillValid =
        _keyId != null && providerKeys.any((k) => k.id == _keyId);
    final next = stillValid
        ? _keyId
        : (providerKeys.isNotEmpty ? providerKeys.first.id : null);
    if (next == _keyId) return;
    _keyId = next;
    if (mounted) setState(() {});
  }

  // ---------------------------------------------------------------------------
  // منطق الإرسال
  // ---------------------------------------------------------------------------

  bool get _needsKey => !(getProvider(_providerId)?.isClientDirect ?? false);

  bool get _canSend =>
      !_sending &&
      _inputController.text.trim().isNotEmpty &&
      (!_needsKey || _keyId != null);

  bool get _hasKeysForProvider =>
      _byokKeys.any((k) => k.providerId == _providerId);

  String _buildSystemPrompt() {
    final base = 'chat_financial_context'.tr();
    if (_loadingContext) return base;
    String fmt(double v) => CurrencyService.formatAmount(v, _currency);
    final context = '$base\n\n'
        'Current total balance: ${fmt(_totalBalance)}. '
        'This month: income ${fmt(_income)}, expenses ${fmt(_expenses)}.';
    return '$context\n\n${ChatPromptRules.buildChatFormatRules(plainText: false)}';
  }

  String _codeToErrorKey(String code) => switch (code) {
        'no-key' => 'chat_error_no_key',
        'insecure' => 'chat_error_insecure',
        'ollama-cors' => 'chat_error_ollama_cors',
        'unauthorized' => 'chat_error_unauthorized',
        'gone' => 'chat_error_gone',
        'vault' => 'chat_error_vault',
        'rate-limit' => 'chat_error_rate_limit',
        'timeout' => 'chat_error_timeout',
        // Agent route codes (mirror web `AgentErrorCode`).
        'rate_limited' => 'chat_error_rate_limited',
        'iteration_limit' => 'chat_error_loop',
        'invalid_args' => 'chat_error_tool',
        'invalid_confirmation' => 'chat_error_tool',
        'tool' => 'chat_error_tool',
        _ => 'chat_error_generic',
      };

  /// Tool name → trace line, mirroring web `TRACE_KEYS`.
  String _traceText(String tool) => switch (tool) {
        'get_spending_breakdown' => 'chat_trace_spending'.tr(),
        'get_financial_snapshot' => 'chat_trace_snapshot'.tr(),
        'create_transaction' => 'chat_trace_transaction'.tr(),
        'get_debts' => 'chat_trace_debts'.tr(),
        'get_budgets' => 'chat_trace_budgets'.tr(),
        'get_goals' => 'chat_trace_goals'.tr(),
        'get_recent_transactions' => 'chat_trace_transactions'.tr(),
        _ => 'chat_trace_generic'.tr(namedArgs: {'tool': tool}),
      };

  /// Tool name → human label on the confirmation card / tool card.
  String _agentToolLabel(String tool) => switch (tool) {
        'get_spending_breakdown' => 'chat_tool_spending'.tr(),
        'get_financial_snapshot' => 'chat_tool_snapshot'.tr(),
        'create_transaction' => 'chat_tool_transaction'.tr(),
        'get_debts' => 'chat_tool_debts'.tr(),
        'get_budgets' => 'chat_tool_budgets'.tr(),
        'get_goals' => 'chat_tool_goals'.tr(),
        'get_recent_transactions' => 'chat_tool_transactions'.tr(),
        _ => 'chat_tool_generic'.tr(),
      };

  /// Tool name → deep link route and label key.
  static final Map<String, ({String route, String labelKey})> _toolDeepLinks = {
    'get_debts': (route: '/debts', labelKey: 'chat_go_to_debts'),
    'get_budgets': (route: '/budgets', labelKey: 'chat_go_to_budgets'),
    'get_goals': (route: '/goals', labelKey: 'chat_go_to_goals'),
    'get_recent_transactions': (route: '/transactions', labelKey: 'chat_go_to_transactions'),
  };

  void _scrollToLatest() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients || !_atBottom) return;
      _scrollController.jumpTo(0);
    });
  }

  Future<void> _send() async {
    if (!_canSend) return;
    final text = _inputController.text.trim();
    _inputController.clear();
    _messages.add(ChatMsg(role: 'user', content: text));
    _completedTools.clear();
    if (_needsKey) {
      await _sendAgent();
    } else {
      await _sendDirect();
    }
  }

  /// Proxy providers: the server owns the tool loop (`/api/byok/agent`).
  ///
  /// Pass [confirmation] — exactly as received — to execute a paused write
  /// tool and finish the turn. Nothing is written before that.
  Future<void> _sendAgent({Map<String, dynamic>? confirmation}) async {
    if (_sending) return;
    _sending = true;
    _stopRequested = false;
    _errorKey = null;
    _noticeKey = null;
    _traceTool = null;
    _pendingConfirmation = null;
    _assistantPartial = '';
    setState(() {});
    _scrollToLatest();
    try {
      await _service.chatAgent(
        providerId: _providerId,
        keyId: _keyId,
        systemPrompt: _buildSystemPrompt(),
        messages: List.of(_messages),
        model: _selectedModel.isEmpty ? null : _selectedModel,
        confirmation: confirmation,
        onEvent: (event) {
          if (!mounted) return;
          switch (event.type) {
            case 'delta':
              setState(() => _assistantPartial += event.text ?? '');
              _scrollToLatest();
            case 'trace':
              setState(() => _traceTool =
                  event.status == 'running' ? event.tool : null);
            case 'tool_result':
              setState(() {
                _traceTool = null;
                if (event.ok && _toolDeepLinks.containsKey(event.tool)) {
                  _completedTools.add(event.tool!);
                }
                if (!event.ok) _errorKey = 'chat_error_tool';
              });
            case 'confirmation_required':
              setState(() {
                _traceTool = null;
                _pendingConfirmation = {
                  'tool': event.tool ?? '',
                  'args': event.args,
                };
              });
            case 'error':
              setState(() {
                _traceTool = null;
                _errorKey = _codeToErrorKey(event.code ?? 'generic');
              });
            case 'done':
              setState(() => _traceTool = null);
          }
        },
        isStopped: () => _stopRequested,
      );
    } on ByokConfigException {
      if (!mounted) return;
      setState(() => _errorKey = 'chat_error_config_missing');
    } on ByokChatException catch (e) {
      if (!mounted) return;
      setState(() => _errorKey = _codeToErrorKey(e.code));
    } catch (_) {
      if (!mounted) return;
      setState(() => _errorKey = 'chat_error_generic');
    } finally {
      if (mounted) {
        final partial = _assistantPartial.trim();
        setState(() {
          _sending = false;
          _stopRequested = false;
          _traceTool = null;
          if (_errorKey == null && partial.isNotEmpty) {
            _messages.add(ChatMsg(role: 'assistant', content: partial));
          }
          _assistantPartial = '';
        });
        _scrollToLatest();
      }
    }
  }

  /// User approved the paused write — execute it and let the model finish.
  Future<void> _confirmPending() async {
    final pending = _pendingConfirmation;
    if (pending == null || _sending) return;
    final tool = pending['tool'];
    final args = pending['args'];
    if (tool is! String || tool.isEmpty || args is! Map<String, dynamic>) {
      return;
    }
    await _sendAgent(confirmation: {'tool': tool, 'args': args});
  }

  void _cancelPending() {
    setState(() {
      _pendingConfirmation = null;
      _noticeKey = 'chat_confirm_cancelled';
    });
  }

  /// clientDirect providers (Ollama): browser/device talks to the model
  /// directly — no proxy, no key, no server tools.
  Future<void> _sendDirect() async {
    _sending = true;
    _stopRequested = false;
    _errorKey = null;
    _noticeKey = null;
    _traceTool = null;
    _pendingConfirmation = null;
    _assistantPartial = '';
    setState(() {});
    _scrollToLatest();
    try {
      await _service.chat(
        providerId: _providerId,
        keyId: _needsKey ? _keyId : null,
        systemPrompt: _buildSystemPrompt(),
        messages: List.of(_messages),
        model: _selectedModel.isEmpty ? null : _selectedModel,
        onDelta: (delta) {
          if (!mounted) return;
          setState(() => _assistantPartial += delta);
          _scrollToLatest();
        },
        isStopped: () => _stopRequested,
      );
    } on ByokConfigException {
      if (!mounted) return;
      setState(() => _errorKey = 'chat_error_config_missing');
    } on ByokChatException catch (e) {
      if (!mounted) return;
      setState(() => _errorKey = _codeToErrorKey(e.code));
    } catch (_) {
      if (!mounted) return;
      setState(() => _errorKey = 'chat_error_generic');
    } finally {
      if (mounted) {
        final partial = _assistantPartial.trim();
        setState(() {
          _sending = false;
          _stopRequested = false;
          if (_errorKey == null && partial.isNotEmpty) {
            _messages.add(ChatMsg(role: 'assistant', content: partial));
          }
          _assistantPartial = '';
        });
        _scrollToLatest();
      }
    }
  }

  void _stop() {
    if (!_sending) return;
    _stopRequested = true;
    setState(() {});
  }

  void _clearChat() {
    setState(() {
      _messages.clear();
      _assistantPartial = '';
      _errorKey = null;
      _noticeKey = null;
      _traceTool = null;
      _pendingConfirmation = null;
      _completedTools.clear();
    });
  }

  void _onProviderChanged(String? id) {
    if (id == null || id == _providerId) return;
    final provider = getProvider(id);
    setState(() {
      _providerId = id;
      _keyId = null;
      _selectedModel = provider?.defaultModel ?? '';
    });
    _syncKeySelection();
  }

  void _resetModel() {
    final provider = getProvider(_providerId);
    setState(() => _selectedModel = provider?.defaultModel ?? '');
  }

  // ---------------------------------------------------------------------------
  // الواجهة
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final provider = getProvider(_providerId);

    return Scaffold(
      backgroundColor: colorScheme.surface,
      appBar: AppBar(
        title: Text('chat_title'.tr()),
        actions: [
          if (_messages.isNotEmpty && !_sending)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              tooltip: 'chat_clear'.tr(),
              onPressed: _clearChat,
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            _buildProviderPanel(
              theme: theme,
              colorScheme: colorScheme,
              providerName: provider?.name ?? _providerId,
            ),
            const SizedBox(height: 4),
            Expanded(
              child: _messages.isEmpty && _assistantPartial.isEmpty
                  ? _buildEmptyState(theme: theme, colorScheme: colorScheme)
                  : _buildMessageList(theme: theme, colorScheme: colorScheme),
            ),
            if (_noticeKey != null)
              _buildNotice(theme: theme, colorScheme: colorScheme),
            if (_pendingConfirmation != null)
              _buildConfirmationCard(theme: theme, colorScheme: colorScheme),
            if (_errorKey != null)
              _buildErrorBanner(theme: theme, colorScheme: colorScheme),
            _buildComposer(theme: theme, colorScheme: colorScheme),
          ],
        ),
      ),
    );
  }

  Widget _buildProviderPanel({
    required ThemeData theme,
    required ColorScheme colorScheme,
    required String providerName,
  }) {
    final showKeyRow =
        _needsKey && !_hasKeysForProvider && !_loadingKeys;

    final provider = getProvider(_providerId);
    final models = provider?.availableModels ?? [];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InputDecorator(
            decoration: InputDecoration(
              labelText: 'chat_provider'.tr(),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 4,
              ),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                isDense: true,
                value: _providerId,
                items: [
                  for (final p in SUPPORTED_PROVIDERS.values)
                    DropdownMenuItem<String>(
                      value: p.id,
                      child: Text(
                        p.name,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
                onChanged: _onProviderChanged,
              ),
            ),
          ),
          const SizedBox(height: 12),
          InputDecorator(
            decoration: InputDecoration(
              labelText: 'chat_model'.tr(),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 4,
              ),
              suffixIcon: _selectedModel.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.restart_alt),
                      tooltip: 'chat_auto_model'.tr(),
                      onPressed: _resetModel,
                    ),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                isDense: true,
                value: _selectedModel.isEmpty ? null : _selectedModel,
                hint: Text('chat_auto_model'.tr()),
                items: [
                  for (final m in models)
                    DropdownMenuItem<String>(
                      value: m,
                      child: Text(m, overflow: TextOverflow.ellipsis),
                    ),
                ],
                onChanged: (v) {
                  if (v != null) setState(() => _selectedModel = v);
                },
              ),
            ),
          ),
          const SizedBox(height: 4),
          if (_needsKey && showKeyRow) ...[
            const SizedBox(height: 8),
            Text(
              'chat_setup_keys_hint'.tr(namedArgs: {'provider': providerName}),
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 4),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const SettingsScreen()),
                  );
                },
                icon: const Icon(Icons.key, size: 18),
                label: Text('chat_setup_keys'.tr()),
              ),
            ),
          ] else if (!_needsKey) ...[
            const SizedBox(height: 8),
            Text(
              'chat_ollama_no_key'.tr(),
              style: theme.textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEmptyState({
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return ListView(
      reverse: true,
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      children: [
        MessageBubble(
          isUser: false,
          content: 'chat_greeting'.tr(),
          theme: theme,
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'chat_context_label'.tr(),
                style: theme.textTheme.labelLarge,
              ),
              const SizedBox(height: 4),
              Text(
                'chat_context_included'.tr(),
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMessageList({
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return ListView(
      reverse: true,
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      children: [
        if (_sending && (_assistantPartial.isNotEmpty || _traceTool == null))
          MessageBubble(
            isUser: false,
            content: _assistantPartial.isEmpty
                ? null
                : _assistantPartial,
            thinking: _assistantPartial.isEmpty,
            theme: theme,
          ),
        if (_traceTool != null) _buildTraceLine(theme: theme, colorScheme: colorScheme),
        // Completed tool cards with deep links (this turn's activity).
        if (_completedTools.isNotEmpty)
          for (final tool in _completedTools)
            if (_toolDeepLinks.containsKey(tool))
              _buildToolCard(
                theme: theme,
                colorScheme: colorScheme,
                tool: tool,
                isRunning: false,
              ),
        for (final m in _messages.reversed)
          MessageBubble(
            isUser: m.role == 'user',
            content: m.content,
            theme: theme,
          ),
      ],
    );
  }

  static const List<(String, String)> _confirmFields = [
    ('type', 'chat_confirm_type'),
    ('amount', 'chat_confirm_amount'),
    ('currency', 'chat_confirm_currency'),
    ('category', 'chat_confirm_category'),
    ('transaction_date', 'chat_confirm_date'),
    ('description', 'chat_confirm_description'),
  ];

  /// Render one confirmation-card value without trusting the model's shape.
  String _confirmValue(String field, dynamic value) {
    if (value == null || value == '') return '—';
    if (field == 'type') {
      return value == 'income' ? 'trans_income'.tr() : 'trans_expense'.tr();
    }
    if (field == 'amount') {
      final n = value is num
          ? value.toDouble()
          : double.tryParse(value.toString());
      return n == null ? value.toString() : CurrencyService.formatAmount(n, _currency);
    }
    return value.toString();
  }

  Widget _buildToolCard({
    required ThemeData theme,
    required ColorScheme colorScheme,
    required String tool,
    required bool isRunning,
  }) {
    final deepLink = _toolDeepLinks[tool];
    final label = _agentToolLabel(tool);
    final doneText = 'chat_tool_done'.tr();
    final goToText = deepLink?.labelKey.tr();

    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: Container(
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isRunning ? colorScheme.primaryContainer : colorScheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isRunning ? colorScheme.primary : colorScheme.outlineVariant,
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (isRunning) ...[
              const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 10),
            ] else ...[
              Icon(
                Icons.check_circle_rounded,
                color: colorScheme.tertiary,
                size: 18,
              ),
              const SizedBox(width: 10),
            ],
            Flexible(
              child: Text(
                isRunning ? _traceText(tool) : '$label $doneText',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isRunning ? colorScheme.onPrimaryContainer : colorScheme.onSurface,
                  fontWeight: isRunning ? FontWeight.w500 : FontWeight.normal,
                ),
              ),
            ),
            if (!isRunning && goToText != null) ...[
              const SizedBox(width: 8),
              TextButton(
                onPressed: () {
                  Navigator.of(context).pushNamed(deepLink!.route);
                },
                style: TextButton.styleFrom(
                  foregroundColor: colorScheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                    side: BorderSide(color: colorScheme.primary),
                  ),
                  textStyle: theme.textTheme.labelLarge?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                child: Text(goToText),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTraceLine({
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    if (_traceTool == null) return const SizedBox.shrink();
    return _buildToolCard(
      theme: theme,
      colorScheme: theme.colorScheme,
      tool: _traceTool!,
      isRunning: true,
    );
  }

  Widget _buildNotice({
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    if (_noticeKey == null) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(_noticeKey!.tr(), style: theme.textTheme.bodySmall),
    );
  }

  Widget _buildConfirmationCard({
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    final pending = _pendingConfirmation;
    if (pending == null) return const SizedBox.shrink();
    final tool = pending['tool'] is String ? pending['tool'] as String : '';
    final args = pending['args'] is Map<String, dynamic>
        ? pending['args'] as Map<String, dynamic>
        : const <String, dynamic>{};

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.primary),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('chat_confirm_title'.tr(), style: theme.textTheme.titleSmall),
          const SizedBox(height: 2),
          Text(
            'chat_confirm_tool'.tr(
              namedArgs: {'tool': _agentToolLabel(tool)},
            ),
            style: theme.textTheme.bodySmall,
          ),
          const SizedBox(height: 10),
          for (final (field, labelKey) in _confirmFields)
            if (args[field] != null && args[field] != '')
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 96,
                      child: Text(
                        labelKey.tr(),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        _confirmValue(field, args[field]),
                        style: theme.textTheme.bodyMedium,
                      ),
                    ),
                  ],
                ),
              ),
          const SizedBox(height: 6),
          Text('chat_confirm_hint'.tr(), style: theme.textTheme.bodySmall),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: _sending ? null : _confirmPending,
                  child: Text('chat_confirm_yes'.tr()),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: _sending ? null : _cancelPending,
                  child: Text('chat_confirm_no'.tr()),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildErrorBanner({
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    if (_errorKey == null) return const SizedBox.shrink();
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: colorScheme.errorContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.error_outline,
              color: colorScheme.onErrorContainer, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _errorKey!.tr(),
              style: TextStyle(color: colorScheme.onErrorContainer),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            tooltip: 'chat_clear'.tr(),
            onPressed: () => setState(() => _errorKey = null),
          ),
        ],
      ),
    );
  }

  Widget _buildComposer({
    required ThemeData theme,
    required ColorScheme colorScheme,
  }) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            child: TextField(
              controller: _inputController,
              focusNode: _inputFocus,
              minLines: 1,
              maxLines: 4,
              textInputAction: TextInputAction.send,
              decoration: InputDecoration(
                hintText: 'chat_input_placeholder'.tr(),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: colorScheme.surfaceContainerHighest,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 10,
                ),
              ),
              onChanged: (_) => setState(() {}),
              onSubmitted: (_) {
                if (_canSend) _send();
              },
            ),
          ),
          const SizedBox(width: 8),
          SizedBox(
            height: 48,
            width: 48,
            child: _sending
                ? IconButton.filled(
                    style: IconButton.styleFrom(
                      backgroundColor: colorScheme.error,
                      foregroundColor: colorScheme.onError,
                    ),
                    onPressed: _stop,
                    icon: const Icon(Icons.stop_rounded),
                    tooltip: 'chat_stop'.tr(),
                  )
                : IconButton.filled(
                    onPressed: _canSend ? _send : null,
                    icon: const Icon(Icons.send_rounded),
                    tooltip: 'chat_send'.tr(),
                  ),
          ),
        ],
      ),
    );
  }
}

