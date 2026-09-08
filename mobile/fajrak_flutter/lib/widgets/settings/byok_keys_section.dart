import 'dart:async';

import 'package:easy_localization/easy_localization.dart';
import 'package:fajrak/services/byok/byok_service.dart';
import 'package:fajrak/services/byok/chat.dart';
import 'package:fajrak/services/byok/providers.dart';
import 'package:fajrak/utils/app_colors.dart';
import 'package:fajrak/utils/error_handler.dart';
import 'package:fajrak/widgets/common/confirm_dialog.dart';
import 'package:fajrak/widgets/settings/settings_accordion.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

/// BYOK keys section (Phase 7) — mirrors web `components/settings/byok-keys-section.tsx`.
///
/// Lists the user's per-provider API keys (metadata only), lets them add /
/// test / remove keys. Keys themselves are stored only in the device secure
/// vault (AD-3) and never sent to Supabase.
class ByokKeysSection extends StatefulWidget {
  const ByokKeysSection({super.key, this.vault, this.service});

  /// Injectable for widget tests (defaults to the real device vault + service).
  final ByokVault? vault;
  final ByokService? service;

  @override
  State<ByokKeysSection> createState() => _ByokKeysSectionState();
}

class _ByokKey {
  final String id;
  final String providerId;
  final String keyName;
  final String keyPrefix;
  final String createdAt;
  String? lastUsedAt;
  final bool isActive;
  bool hasKey;

  _ByokKey({
    required this.id,
    required this.providerId,
    required this.keyName,
    required this.keyPrefix,
    required this.createdAt,
    required this.lastUsedAt,
    required this.isActive,
    required this.hasKey,
  });
}

class _ByokKeysSectionState extends State<ByokKeysSection> {
  late final ByokVault _vault;
  late final ByokService _service;
  late final TextEditingController _nameCtrl;
  late final TextEditingController _valueCtrl;

  bool _loading = true;
  bool _saving = false;
  String? _testingId;
  bool _vaultUnavailable = false;
  String _newProvider = '';
  bool _showKey = false;
  List<_ByokKey> _keys = [];

  // Get only proxy providers (kind == 'proxy') — clientDirect providers
  // (e.g. Local Ollama) dial the LLM directly from the device and never
  // store a key here.
  late final List<ByokProvider> _proxyProviders;

  @override
  void initState() {
    super.initState();
    _vault = widget.vault ?? ByokVault();
    _service = widget.service ?? ByokService();
    _nameCtrl = TextEditingController();
    _valueCtrl = TextEditingController();
    _proxyProviders = SUPPORTED_PROVIDERS.values
        .where((p) => p.kind == 'proxy')
        .toList();
    _loadKeys();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _valueCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadKeys() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) {
        setState(() => _loading = false);
        return;
      }

      final data = await Supabase.instance.client
          .from('user_byok_keys')
          .select(
            'id, provider_id, key_name, key_prefix, created_at, last_used_at, is_active',
          )
          .eq('user_id', user.id)
          .order('created_at', ascending: false);

      final rows = List<Map<String, dynamic>>.from(data);
      // Fast presence check against the local vault (never decrypts).
      final vaulted = await Future.wait(
        rows.map((r) => _vault.hasProviderKey(r['id'] as String)),
      );
      if (!mounted) return;
      setState(() {
        _keys = [
          for (var i = 0; i < rows.length; i++)
            _ByokKey(
              id: rows[i]['id'] as String,
              providerId: rows[i]['provider_id'] as String,
              keyName: rows[i]['key_name'] as String,
              keyPrefix: rows[i]['key_prefix'] as String? ?? '',
              createdAt: rows[i]['created_at'] as String,
              lastUsedAt: rows[i]['last_used_at'] as String?,
              isActive: rows[i]['is_active'] as bool? ?? false,
              hasKey: vaulted[i],
            ),
        ];
        _vaultUnavailable = false;
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _vaultUnavailable = true;
          _loading = false;
        });
        // Fail silently on table-missing (migration not applied yet) but still
        // surface non-RLS errors.
        ErrorHandler.handle(
          e,
          context: context,
          developerMessage: 'ByokKeys Load',
        );
      }
    }
  }

  static String _clip(String s, int start, int end) {
    final s0 = start.clamp(0, s.length);
    final e0 = end.clamp(s0, s.length);
    return s.substring(s0, e0);
  }

  String getKeyPrefix(String providerId, String fullKey) {
    final provider = getProvider(providerId);
    if (provider == null) {
      return fullKey.length > 8 ? '${_clip(fullKey, 0, 8)}...' : fullKey;
    }
    if (providerId == 'nvidia-nim') {
      return fullKey.startsWith('nvapi-')
          ? 'nvapi-${_clip(fullKey, 6, 10)}...'
          : '${_clip(fullKey, 0, 8)}...';
    }
    if (providerId == 'openai') {
      return fullKey.startsWith('sk-')
          ? 'sk-${_clip(fullKey, 3, 7)}...'
          : '${_clip(fullKey, 0, 8)}...';
    }
    if (providerId == 'anthropic') {
      return fullKey.startsWith('sk-ant-')
          ? 'sk-ant-${_clip(fullKey, 7, 11)}...'
          : '${_clip(fullKey, 0, 8)}...';
    }
    if (providerId == 'openrouter') {
      return fullKey.startsWith('sk-or-')
          ? 'sk-or-${_clip(fullKey, 6, 10)}...'
          : '${_clip(fullKey, 0, 8)}...';
    }
    return fullKey.length > 8 ? '${_clip(fullKey, 0, 8)}...' : fullKey;
  }

  Future<void> _handleSave() async {
    if (_saving) return;
    final name = _nameCtrl.text.trim();
    final rawKey = _valueCtrl.text.trim();
    if (name.isEmpty || _newProvider.isEmpty || rawKey.isEmpty) return;

    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;

    _saving = true;
    setState(() {});
    final keyId = const Uuid().v4();
    try {
      // 1. Encrypt into the local secure vault FIRST (AD-3: device-only).
      await _vault.saveProviderKey(keyId, rawKey);

      // 2. Persist metadata only to Supabase — never the key itself.
      final res = await Supabase.instance.client.from('user_byok_keys').insert({
        'id': keyId,
        'user_id': user.id,
        'provider_id': _newProvider,
        'key_name': name,
        'key_prefix': getKeyPrefix(_newProvider, rawKey),
        'is_active': true,
      });
      if (res.error != null) {
        // Roll back the orphaned ciphertext.
        await _vault.deleteProviderKey(keyId);
        throw res.error!;
      }

      if (mounted) {
        setState(() {
          _keys.insert(
            0,
            _ByokKey(
              id: keyId,
              providerId: _newProvider,
              keyName: name,
              keyPrefix: getKeyPrefix(_newProvider, rawKey),
              createdAt: DateTime.now().toUtc().toIso8601String(),
              lastUsedAt: null,
              isActive: true,
              hasKey: true,
            ),
          );
          _nameCtrl.clear();
          _valueCtrl.clear();
          _newProvider = '';
          _showKey = false;
        });
        _showToast('settings_byok_keys_created', success: true);
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.handle(
          e,
          context: context,
          developerMessage: 'ByokKeys Save',
        );
      }
    } finally {
      _saving = false;
      if (mounted) setState(() {});
    }
  }

  Future<void> _handleTest(_ByokKey key) async {
    if (_testingId != null) return;
    setState(() => _testingId = key.id);
    try {
      // Recover the raw key ON DEMAND from the device vault only.
      final providerKey = await _vault.getProviderKey(key.id);
      if (!mounted) return;
      if (providerKey == null || providerKey.isEmpty) {
        setState(() => _testingId = null);
        _showToast('settings_byok_keys_no_local');
        return;
      }
      final provider = getProvider(key.providerId);
      if (provider == null) {
        setState(() => _testingId = null);
        _showToast('settings_byok_keys_test_fail');
        return;
      }

      // Non-streamed 1-shot body — exactly like web.
      await _service.chat(
        providerId: key.providerId,
        keyId: key.id,
        messages: const [ChatMsg(role: 'user', content: 'Hi')],
        model: provider.defaultModel,
        stream: false,
      );

      if (!mounted) return;
      setState(() => _testingId = null);
      _showToast('settings_byok_keys_test_ok', success: true);

      // Best-effort last_used_at stamp (metadata only).
      try {
        await Supabase.instance.client
            .from('user_byok_keys')
            .update({'last_used_at': DateTime.now().toUtc().toIso8601String()})
            .eq('id', key.id);
        if (mounted) {
          setState(() {
            key.lastUsedAt = DateTime.now().toUtc().toIso8601String();
          });
        }
      } catch (_) {}
    } catch (e) {
      if (mounted) {
        setState(() => _testingId = null);
        _showToast('settings_byok_keys_test_fail');
        ErrorHandler.handle(
          e,
          context: context,
          developerMessage: 'ByokKeys Test',
        );
      }
    }
  }

  Future<void> _handleRemove(_ByokKey key) async {
    if (_saving) return;
    _saving = true;
    setState(() {});
    try {
      await Supabase.instance.client
          .from('user_byok_keys')
          .delete()
          .eq('id', key.id);
      await _vault.deleteProviderKey(key.id);
      if (mounted) {
        setState(() {
          _keys.removeWhere((k) => k.id == key.id);
        });
        _showToast('settings_byok_keys_revoked', success: true);
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.handle(
          e,
          context: context,
          developerMessage: 'ByokKeys Remove',
        );
      }
    } finally {
      _saving = false;
      if (mounted) setState(() {});
    }
  }

  void _showToast(String key, {bool success = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(key.tr()),
        backgroundColor: success ? AppColors.success : AppColors.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'settings_byok_keys_never'.tr();
    final d = DateTime.tryParse(dateStr);
    if (d == null) return 'settings_byok_keys_never'.tr();
    final loc = Localizations.localeOf(context).languageCode == 'ar';
    return loc
        ? '${d.day} ${_arMonth(d.month)} ${d.year}'
        : '${_enMonth(d.month)} ${d.day}, ${d.year}';
  }

  static const _monthsAr = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  static const _monthsEn = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  String _arMonth(int m) => _monthsAr[m - 1];
  String _enMonth(int m) => _monthsEn[m - 1];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final activeKeys = _keys.where((k) => k.isActive).toList();

    return SettingsAccordion(
      icon: Icons.vpn_key,
      title: 'settings_byok_keys'.tr(),
      initiallyExpanded: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'settings_byok_keys_desc'.tr(),
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 12,
              height: 1.7,
            ),
          ),
          const SizedBox(height: 12),

          if (_vaultUnavailable)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.error.withValues(alpha: 0.3),
                ),
              ),
              child: Text(
                'settings_byok_keys_vault_unavailable'.tr(),
                style: TextStyle(
                  color: AppColors.error,
                  fontSize: 12,
                  height: 1.6,
                ),
              ),
            ),

          _buildProviderChips(colorScheme),
          const SizedBox(height: 12),

          if (_loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: CircularProgressIndicator(
                  color: AppColors.primary,
                  strokeWidth: 2,
                ),
              ),
            )
          else if (activeKeys.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: colorScheme.outlineVariant),
              ),
              child: Column(
                children: [
                  const Text('🔐', style: TextStyle(fontSize: 28)),
                  const SizedBox(height: 8),
                  Text(
                    'settings_byok_keys_none'.tr(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            )
          else
            ...activeKeys.map((k) => _buildKeyCard(k, colorScheme)),

          const SizedBox(height: 16),
          _buildAddForm(colorScheme),
        ],
      ),
    );
  }

  Widget _buildProviderChips(ColorScheme colorScheme) {
    return Theme(
      data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: EdgeInsets.zero,
        childrenPadding: const EdgeInsets.only(top: 8),
        title: Text(
          'settings_byok_providers_title'.tr(),
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurfaceVariant,
          ),
        ),
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final p in _proxyProviders)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Text(
                    '${p.name} (${p.defaultModel})',
                    style: TextStyle(
                      color: colorScheme.primary,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildKeyCard(_ByokKey key, ColorScheme colorScheme) {
    final provider = getProvider(key.providerId);
    final testing = _testingId == key.id;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: colorScheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  key.keyName,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: colorScheme.onSurface,
                  ),
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextButton.icon(
                    onPressed: testing ? null : () => _handleTest(key),
                    icon: testing
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppColors.primary,
                            ),
                          )
                        : Icon(
                            Icons.check_circle_outline,
                            size: 16,
                            color: colorScheme.primary,
                          ),
                    label: Text(
                      testing
                          ? 'settings_byok_keys_testing'.tr()
                          : 'settings_byok_keys_test'.tr(),
                    ),
                    style: TextButton.styleFrom(
                      foregroundColor: colorScheme.primary,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                    ),
                  ),
                  TextButton(
                    onPressed: () => _confirmRemove(key),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.error,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                    ),
                    child: Text(
                      'settings_byok_keys_revoke'.tr(),
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            key.keyPrefix,
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 12,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                '${'settings_byok_keys_created_at'.tr()}: ${_formatDate(key.createdAt)}',
                style: TextStyle(
                  fontSize: 11,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(width: 16),
              Text(
                '${'settings_byok_keys_last_used'.tr()}: ${_formatDate(key.lastUsedAt)}',
                style: TextStyle(
                  fontSize: 11,
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: colorScheme.primaryContainer.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  provider?.name ?? key.providerId,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onPrimaryContainer,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: key.hasKey
                      ? AppColors.success.withValues(alpha: 0.1)
                      : colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: key.hasKey
                        ? AppColors.success.withValues(alpha: 0.3)
                        : colorScheme.outlineVariant,
                  ),
                ),
                child: Text(
                  key.hasKey
                      ? 'settings_byok_keys_local'.tr()
                      : 'settings_byok_keys_not_local'.tr(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: key.hasKey
                        ? AppColors.success
                        : colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAddForm(ColorScheme colorScheme) {
    final canAdd =
        _nameCtrl.text.trim().isNotEmpty &&
        _newProvider.isNotEmpty &&
        _valueCtrl.text.trim().isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'settings_byok_keys_add_new'.tr(),
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurfaceVariant,
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          initialValue: _newProvider.isEmpty ? null : _newProvider,
          decoration: _inputDecoration(
            colorScheme,
            'settings_byok_keys_select_provider'.tr(),
          ),
          items: [
            for (final p in _proxyProviders)
              DropdownMenuItem(
                value: p.id,
                child: Text('${p.name} — ${p.defaultModel}'),
              ),
          ],
          onChanged: (v) => setState(() => _newProvider = v ?? ''),
          style: TextStyle(fontSize: 13, color: colorScheme.onSurface),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _nameCtrl,
          onChanged: (_) => setState(() {}),
          decoration: _inputDecoration(
            colorScheme,
            'settings_byok_keys_name_placeholder'.tr(),
          ),
          style: TextStyle(fontSize: 13, color: colorScheme.onSurface),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _valueCtrl,
                onChanged: (_) => setState(() {}),
                obscureText: !_showKey,
                autofocus: true,
                decoration: _inputDecoration(
                  colorScheme,
                  'settings_byok_keys_value_placeholder'.tr(),
                ),
                style: TextStyle(fontSize: 13, color: colorScheme.onSurface),
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              onPressed: () => setState(() => _showKey = !_showKey),
              icon: Icon(
                _showKey ? Icons.visibility_off : Icons.visibility,
                size: 20,
              ),
              tooltip: _showKey ? 'Hide key' : 'Show key',
              style: IconButton.styleFrom(
                backgroundColor: colorScheme.surfaceContainerHighest,
                foregroundColor: colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ElevatedButton(
          onPressed: _saving || !canAdd ? null : _handleSave,
          style: ElevatedButton.styleFrom(
            backgroundColor: _saving || !canAdd
                ? colorScheme.surfaceContainerHighest
                : colorScheme.primaryContainer,
            foregroundColor: _saving || !canAdd
                ? colorScheme.onSurfaceVariant
                : colorScheme.onPrimaryContainer,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          ),
          child: _saving
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: AppColors.primary,
                  ),
                )
              : Text(
                  '+ ${'settings_byok_keys_add'.tr()}',
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
        ),
      ],
    );
  }

  InputDecoration _inputDecoration(ColorScheme colorScheme, String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(
        color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
      ),
      filled: true,
      fillColor: colorScheme.surfaceContainerHighest,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colorScheme.outlineVariant),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: colorScheme.outlineVariant),
      ),
    );
  }

  void _confirmRemove(_ByokKey key) {
    final isAr = Localizations.localeOf(context).languageCode == 'ar';
    ConfirmDialog.show(
      context: context,
      title: 'settings_byok_keys_revoke'.tr(),
      message: isAr
          ? 'هل أنت متأكد من حذف هذا المفتاح؟'
          : 'Are you sure? This key will be permanently removed.',
      confirmLabel: 'settings_byok_keys_revoke'.tr(),
      cancelLabel: 'cancel'.tr(),
      danger: true,
      onConfirm: () => _handleRemove(key),
    );
  }
}
