import 'package:flutter/material.dart';
import '../../utils/app_colors.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'settings_accordion.dart';
import '../common/confirm_dialog.dart';

class ExportDeleteSection extends StatefulWidget {
  const ExportDeleteSection({super.key});
  @override
  State<ExportDeleteSection> createState() => _ExportDeleteSectionState();
}

class _ExportDeleteSectionState extends State<ExportDeleteSection> {
  bool _loading = false;
  bool _loggingOut = false;
  bool _showDeleteConfirm = false;
  final _deleteInputCtrl = TextEditingController();
  bool _deleting = false;

  @override
  void dispose() {
    _deleteInputCtrl.dispose();
    super.dispose();
  }

  Future<void> _exportData() async {
    setState(() => _loading = true);
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }

    final txRes = await Supabase.instance.client
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', ascending: false);
    final data = txRes as List;
    if (data.isEmpty) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('settings_no_export'.tr(),
                style: const TextStyle())));
      }
      return;
    }

    final buffer = StringBuffer();
    buffer.writeln('csv_header'.tr());
    for (final tx in data) {
      final type = tx['type'] == 'income' ? 'csv_income'.tr() : 'csv_expense'.tr();
      buffer.writeln(
          '${tx['transaction_date']},$type,${tx['amount']},${tx['category'] ?? ''},${tx['description'] ?? ''}');
    }

    final directory = await getTemporaryDirectory();
    final file = File(
        '${directory.path}/fajrak_export_${DateTime.now().millisecondsSinceEpoch}.csv');
    await file.writeAsString('\uFEFF${buffer.toString()}');

    await SharePlus.instance.share(ShareParams(files: [XFile(file.path)], subject: 'settings_export_msg'.tr()));
    if (mounted) setState(() => _loading = false);
  }

  void _shareApp() {
    final text = 'settings_share_msg'.tr();
    SharePlus.instance.share(ShareParams(text: text));
  }

  Future<void> _deleteAccount() async {
    if (_deleteInputCtrl.text.trim() != 'settings_delete_confirm_text'.tr()) return;
    setState(() => _deleting = true);
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      setState(() => _deleting = false);
      return;
    }

    try {
      await Supabase.instance.client
          .rpc('delete_user_account', params: {'user_id': user.id});
      await Supabase.instance.client.auth.signOut();
      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _deleting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('error_generic'.tr(), style: const TextStyle())),
        );
      }
    }
  }

  Future<void> _logout() async {
    setState(() => _loggingOut = true);
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {
      // Ignore network errors — local session is cleared regardless
    } finally {
      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      children: [
        // Export
        SettingsAccordion(
          icon: Icons.file_download_outlined,
          title: 'settings_export'.tr(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'settings_assets_desc'.tr(),
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 12,
                  height: 1.6,
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _loading ? null : _exportData,
                  icon: const Icon(Icons.file_download_outlined, size: 20),
                  label: Text(
                    'settings_export'.tr(),
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colorScheme.surface,
                    foregroundColor: colorScheme.onSurface,
                    side: BorderSide(color: colorScheme.outlineVariant),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        ),
        
        // Share
        SettingsAccordion(
          icon: Icons.share_outlined,
          title: 'share_title'.tr(),
          child: Column(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.asset(
                  Theme.of(context).brightness == Brightness.dark
                      ? 'assets/images/app_icon.png'
                      : 'assets/images/app_icon_light.jpg',
                  width: 72,
                  height: 72,
                  fit: BoxFit.cover,
                  cacheWidth: 144,
                  cacheHeight: 144,
                  semanticLabel: 'app_logo_label'.tr(),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'share_subtitle'.tr(),
                style: TextStyle(
                  color: colorScheme.onSurface,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'share_body'.tr(),
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: colorScheme.onSurfaceVariant,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _shareApp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text(
                    'share_btn'.tr(),
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Danger Zone
        SettingsAccordion(
          icon: Icons.warning_amber,
          title: 'settings_account_danger_zone'.tr(),
          child: Column(
            children: [
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: _loggingOut
                      ? null
                      : () {
                          ConfirmDialog.show(
                            context: context,
                            title: 'settings_logout'.tr(),
                            message: 'settings_logout_confirm_msg'.tr(),
                            confirmLabel: 'settings_logout'.tr(),
                            danger: true,
                            onConfirm: _logout,
                          );
                        },
                  child: _loggingOut
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.error),
                        )
                      : Text(
                          'settings_logout'.tr(),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                ),
              ),
              const SizedBox(height: 20),
              Divider(color: colorScheme.outlineVariant),
              const SizedBox(height: 10),
              if (!_showDeleteConfirm)
                SizedBox(
                  width: double.infinity,
                  child: TextButton(
                    onPressed: () => setState(() => _showDeleteConfirm = true),
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.error.withValues(alpha: 0.7),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: Text(
                      'delete'.tr(),
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                    ),
                  ),
                )
              else ...[
                Text(
                  'settings_delete_account_warning'.tr(),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: colorScheme.onSurfaceVariant,
                    fontSize: 12,
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _deleteInputCtrl,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: colorScheme.onSurface),
                  decoration: InputDecoration(
                    hintText: 'delete_account_confirmation_text'.tr(),
                    hintStyle: TextStyle(color: colorScheme.onSurfaceVariant),
                    filled: true,
                    fillColor: colorScheme.surface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: colorScheme.error, width: 0.5),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: (_deleteInputCtrl.text.trim() != 'settings_delete_confirm_text'.tr() || _deleting)
                            ? null
                            : _deleteAccount,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.error,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: _deleting
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text(
                                'confirm_delete'.tr(),
                                style: const TextStyle(fontWeight: FontWeight.w700),
                              ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          setState(() {
                            _showDeleteConfirm = false;
                            _deleteInputCtrl.clear();
                          });
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: colorScheme.onSurfaceVariant,
                          side: BorderSide(color: colorScheme.outlineVariant),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: Text('cancel'.tr(), style: const TextStyle()),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
