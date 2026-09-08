import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../services/accounts_service.dart';
import '../../services/byok/byok_service.dart';
import '../../services/byok/chat.dart';
import '../../services/byok/providers.dart';
import '../../services/currency_service.dart';
import '../../services/finance_service.dart';
import '../../screens/settings/settings_screen.dart';
import '../../utils/error_handler.dart';

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
    this.currency = 'KWD',
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

  final TextEditingController _modelController = TextEditingController();
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
  bool _loadingKeys = true;
  bool _loadingContext = true;
  bool _atBottom = true;

  double _totalBalance = 0;
  double _income = 0;
  double _expenses = 0;
  String _currency = 'KWD';

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
    _modelController.dispose();
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
    String currency = 'KWD';
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
          _currency = contextData.currency.isEmpty ? 'KWD' : contextData.currency;
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
    if (_keyId != null && !providerKeys.any((k) => k.id == _keyId)) {
      _keyId = providerKeys.isNotEmpty ? providerKeys.first.id : null;
      if (mounted) setState(() {});
    }
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
    return '$base\n\n'
        'Current total balance: ${fmt(_totalBalance)}. '
        'This month: income ${fmt(_income)}, expenses ${fmt(_expenses)}.';
  }

  String _codeToErrorKey(String code) => switch (code) {
        'no-key' => 'chat_error_no_key',
        'insecure' => 'chat_error_insecure',
        'ollama-cors' => 'chat_error_ollama_cors',
        'unauthorized' => 'chat_error_unauthorized',
        'vault' => 'chat_error_vault',
        'rate-limit' => 'chat_error_rate_limit',
        'timeout' => 'chat_error_timeout',
        _ => 'chat_error_generic',
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
    _sending = true;
    _stopRequested = false;
    _errorKey = null;
    _assistantPartial = '';
    _messages.add(ChatMsg(role: 'user', content: text));
    setState(() {});
    _scrollToLatest();
    try {
      await _service.chat(
        providerId: _providerId,
        keyId: _needsKey ? _keyId : null,
        systemPrompt: _buildSystemPrompt(),
        messages: List.of(_messages),
        model: _modelController.text.trim().isEmpty
            ? null
            : _modelController.text.trim(),
        onDelta: (delta) {
          if (!mounted) return;
          setState(() => _assistantPartial += delta);
          _scrollToLatest();
        },
        isStopped: () => _stopRequested,
      );
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
    });
  }

  void _onProviderChanged(String? id) {
    if (id == null || id == _providerId) return;
    setState(() {
      _providerId = id;
      _keyId = null;
      _modelController.clear();
    });
  }

  void _resetModel() {
    setState(() => _modelController.clear());
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
          TextField(
            controller: _modelController,
            decoration: InputDecoration(
              labelText: 'chat_model'.tr(),
              hintText: 'chat_auto_model'.tr(),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              suffixIcon: _modelController.text.isEmpty
                  ? null
                  : IconButton(
                      icon: const Icon(Icons.restart_alt),
                      tooltip: 'chat_auto_model'.tr(),
                      onPressed: _resetModel,
                    ),
            ),
            onChanged: (_) => setState(() {}),
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
        _MessageBubble(
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
        if (_sending)
          _MessageBubble(
            isUser: false,
            content: _assistantPartial.isEmpty
                ? null
                : _assistantPartial,
            thinking: _assistantPartial.isEmpty,
            theme: theme,
          ),
        for (final m in _messages.reversed)
          _MessageBubble(
            isUser: m.role == 'user',
            content: m.content,
            theme: theme,
          ),
      ],
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

class _MessageBubble extends StatelessWidget {
  final bool isUser;
  final String? content;
  final bool thinking;
  final ThemeData theme;

  const _MessageBubble({
    required this.isUser,
    required this.content,
    required this.theme,
    this.thinking = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = theme.colorScheme;
    final bubbleColor =
        isUser ? colorScheme.primary : colorScheme.secondaryContainer;
    final textColor = isUser ? colorScheme.onPrimary : colorScheme.onSurface;

    return Align(
      alignment: isUser
          ? AlignmentDirectional.centerEnd
          : AlignmentDirectional.centerStart,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.78,
        ),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: bubbleColor,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(isUser ? 16 : 4),
            bottomRight: Radius.circular(isUser ? 4 : 16),
          ),
        ),
        child: thinking
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'chat_thinking'.tr(),
                    style: TextStyle(color: textColor, fontStyle: FontStyle.italic),
                  ),
                ],
              )
            : Text(
                content ?? '',
                style: TextStyle(color: textColor),
              ),
      ),
    );
  }
}