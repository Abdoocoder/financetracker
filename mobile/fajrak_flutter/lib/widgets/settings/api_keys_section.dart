import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:http/http.dart' as http;
import '../../utils/app_colors.dart';
import '../../utils/error_handler.dart';
import 'settings_accordion.dart';

class ApiKeysSection extends StatefulWidget {
  const ApiKeysSection({super.key});

  @override
  State<ApiKeysSection> createState() => _ApiKeysSectionState();
}

class _ApiKeysSectionState extends State<ApiKeysSection> {
  bool _loading = true;
  bool _generating = false;
  final _nameCtrl = TextEditingController();
  List<Map<String, dynamic>> _keys = [];
  String? _newKey;

  @override
  void initState() {
    super.initState();
    _loadKeys();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadKeys() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return;

      final data = await Supabase.instance.client
          .from('user_api_keys')
          .select('id, user_id, name, key_prefix, scopes, rate_limit_per_min, is_active, last_used_at, expires_at, created_at')
          .eq('user_id', user.id)
          .order('created_at', ascending: false);

      if (mounted) {
        setState(() {
          _keys = List<Map<String, dynamic>>.from(data ?? []);
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.handle(e, context: context, developerMessage: 'API Keys Load');
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _generateKey() async {
    if (_generating || _nameCtrl.text.trim().isEmpty) return;
    _generating = true;
    setState(() {});

    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) return;

      final response = await http.post(
        Uri.parse('https://fajrak.com/api/api-keys/create'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${session.accessToken}',
        },
        body: jsonEncode({'name': _nameCtrl.text.trim()}),
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        setState(() {
          _newKey = result['full_key'];
          _nameCtrl.clear();
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('settings_api_keys_created'.tr()),
              backgroundColor: AppColors.success,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
        _loadKeys();
      } else {
        final result = jsonDecode(response.body);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['error'] ?? 'Error'),
              backgroundColor: AppColors.error,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.handle(e, context: context, developerMessage: 'API Key Generate');
      }
    } finally {
      _generating = false;
      if (mounted) setState(() {});
    }
  }

  Future<void> _revokeKey(String keyId) async {
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) return;

      final response = await http.post(
        Uri.parse('https://fajrak.com/api/api-keys/revoke'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${session.accessToken}',
        },
        body: jsonEncode({'key_id': keyId}),
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('settings_api_keys_revoked'.tr()),
            backgroundColor: AppColors.success,
            behavior: SnackBarBehavior.floating,
          ),
        );
        _loadKeys();
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.handle(e, context: context, developerMessage: 'API Key Revoke');
      }
    }
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'settings_api_keys_never'.tr();
    final d = DateTime.tryParse(dateStr);
    if (d == null) return 'settings_api_keys_never'.tr();
    return '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final activeKeys = _keys.where((k) => k['is_active'] == true).toList();

    return SettingsAccordion(
      icon: Icons.key,
      title: 'settings_api_keys'.tr(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Description
          Text(
            'settings_api_keys_desc'.tr(),
            style: TextStyle(
              color: colorScheme.onSurfaceVariant,
              fontSize: 12,
              height: 1.7,
            ),
          ),
          const SizedBox(height: 16),

          // Existing keys
          if (_loading)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 2),
              ),
            )
          else if (activeKeys.isEmpty && _newKey == null)
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
                  const Text('🔑', style: TextStyle(fontSize: 28)),
                  const SizedBox(height: 8),
                  Text(
                    'settings_api_keys_none'.tr(),
                    style: TextStyle(color: colorScheme.onSurfaceVariant, fontSize: 13),
                  ),
                ],
              ),
            )
          else
            ...activeKeys.map((key) => _buildKeyCard(key, colorScheme)),

          // Newly created key
          if (_newKey != null) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'settings_api_keys_created'.tr(),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: AppColors.success,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: colorScheme.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: colorScheme.outlineVariant),
                    ),
                    child: SelectableText(
                      _newKey!,
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                        color: colorScheme.onSurface,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: _newKey!));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('settings_api_keys_copied'.tr()),
                                backgroundColor: AppColors.success,
                                behavior: SnackBarBehavior.floating,
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.success,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: Text('settings_api_keys_copy'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: () => setState(() => _newKey = null),
                        icon: const Icon(Icons.close, size: 18),
                        style: IconButton.styleFrom(
                          backgroundColor: colorScheme.surfaceContainerHighest,
                          foregroundColor: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],

          // Generate new key form
          if (_newKey == null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _nameCtrl,
                    decoration: InputDecoration(
                      hintText: 'settings_api_keys_name_placeholder'.tr(),
                      hintStyle: TextStyle(color: colorScheme.onSurfaceVariant.withValues(alpha: 0.5)),
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
                    ),
                    style: TextStyle(fontSize: 13, color: colorScheme.onSurface),
                    textAlign: TextAlign.center,
                    onSubmitted: (_) => _generateKey(),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _generating || _nameCtrl.text.trim().isEmpty ? null : _generateKey,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _generating || _nameCtrl.text.trim().isEmpty
                        ? colorScheme.surfaceContainerHighest
                        : colorScheme.primaryContainer,
                    foregroundColor: _generating || _nameCtrl.text.trim().isEmpty
                        ? colorScheme.onSurfaceVariant
                        : colorScheme.onPrimaryContainer,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                  ),
                  child: _generating
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                      : Text(
                          '+ ${'settings_api_keys_generate'.tr()}',
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                ),
              ],
            ),
          ],

          // Usage example
          if (activeKeys.isNotEmpty) ...[
            const SizedBox(height: 16),
            Theme(
              data: theme.copyWith(dividerColor: Colors.transparent),
              child: ExpansionTile(
                tilePadding: EdgeInsets.zero,
                childrenPadding: const EdgeInsets.all(14),
                title: Text(
                  'settings_api_keys_usage_title'.tr(),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: colorScheme.outlineVariant),
                    ),
                    child: Text(
                      '${'settings_api_keys_usage_method'.tr()} ${'settings_api_keys_usage_url'.tr()}\n'
                      '${'settings_api_keys_usage_header'.tr()}\n'
                      'Content-Type: application/json\n\n'
                      '${'settings_api_keys_usage_body'.tr()}',
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: colorScheme.onSurfaceVariant,
                        height: 1.8,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildKeyCard(Map<String, dynamic> key, ColorScheme colorScheme) {
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
                  key['name'] ?? '',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: colorScheme.onSurface,
                  ),
                ),
              ),
              TextButton(
                onPressed: () => _showRevokeDialog(key['id']),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.error,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                ),
                child: Text(
                  'settings_api_keys_revoke'.tr(),
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            key['key_prefix'] ?? '',
            style: TextStyle(
              fontFamily: 'monospace',
              fontSize: 12,
              color: colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text(
                '${'settings_api_keys_created_at'.tr()}: ${_formatDate(key['created_at'])}',
                style: TextStyle(fontSize: 11, color: colorScheme.onSurfaceVariant),
              ),
              const SizedBox(width: 16),
              Text(
                '${'settings_api_keys_last_used'.tr()}: ${_formatDate(key['last_used_at'])}',
                style: TextStyle(fontSize: 11, color: colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showRevokeDialog(String keyId) {
    showModalBottomSheet(
      context: context,
      useSafeArea: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'settings_api_keys_revoke'.tr(),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 12),
            Text(
              Localizations.localeOf(context).languageCode == 'ar'
                  ? 'هل أنت متأكد من إلغاء صلاحية هذا المفتاح؟ لن تتمكن من استخدامه مجدداً.'
                  : 'Are you sure? This key will be permanently deactivated.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Theme.of(ctx).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _revokeKey(keyId);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.error,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text('settings_api_keys_revoke'.tr(), style: const TextStyle(fontWeight: FontWeight.w800)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Theme.of(ctx).colorScheme.outlineVariant),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text('cancel'.tr(), style: const TextStyle(fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
