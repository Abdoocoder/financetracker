import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:easy_localization/easy_localization.dart';
import '../../services/investments_service.dart';

class AddInvestmentDialog extends StatefulWidget {
  final Map<String, dynamic>? existing;
  final VoidCallback onSaved;

  const AddInvestmentDialog({super.key, this.existing, required this.onSaved});

  @override
  State<AddInvestmentDialog> createState() => _AddInvestmentDialogState();
}

class _AddInvestmentDialogState extends State<AddInvestmentDialog> {
  late final TextEditingController _symbolCtrl;
  late final TextEditingController _nameCtrl;
  late final TextEditingController _sharesCtrl;
  late final TextEditingController _avgPriceCtrl;
  late final TextEditingController _currentPriceCtrl;
  bool _isHalal = true;
  bool _saving = false;
  bool _fetchingPrice = false;
  String? _editingId;
  DateTime? _purchaseDate;

  @override
  void initState() {
    super.initState();
    _symbolCtrl = TextEditingController(text: widget.existing?['symbol'] ?? '');
    _nameCtrl = TextEditingController(text: widget.existing?['name'] ?? '');
    _sharesCtrl = TextEditingController(
        text: widget.existing?['shares']?.toString() ?? '');
    _avgPriceCtrl = TextEditingController(
        text: widget.existing?['avg_buy_price']?.toString() ?? '');
    _currentPriceCtrl = TextEditingController(
        text: widget.existing?['current_price']?.toString() ?? '');
    _isHalal = widget.existing?['is_halal'] as bool? ?? false;
    _editingId = widget.existing?['id']?.toString();
    if (widget.existing == null) _isHalal = true;
    final pd = widget.existing?['purchase_date'];
    if (pd != null) _purchaseDate = DateTime.tryParse(pd.toString());
  }

  @override
  void dispose() {
    _symbolCtrl.dispose();
    _nameCtrl.dispose();
    _sharesCtrl.dispose();
    _avgPriceCtrl.dispose();
    _currentPriceCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchLivePrice() async {
    final symbol = _symbolCtrl.text.trim();
    if (symbol.isEmpty) return;

    setState(() => _fetchingPrice = true);
    try {
      final price = await InvestmentsService.fetchPrice(symbol);
      if (price != null && mounted) {
        setState(() {
          _currentPriceCtrl.text = price.toStringAsFixed(2);
          if (_avgPriceCtrl.text.isEmpty) {
            _avgPriceCtrl.text = price.toStringAsFixed(2);
          }
        });
      }
    } finally {
      if (mounted) setState(() => _fetchingPrice = false);
    }
  }

  Future<void> _addInvestment() async {
    if (_saving) return;
    if (_symbolCtrl.text.isEmpty || _sharesCtrl.text.isEmpty) return;
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    _saving = true;
    setState(() {});
    HapticFeedback.mediumImpact();

    try {
      final purchaseDateStr = _purchaseDate != null
          ? '${_purchaseDate!.year}-${_purchaseDate!.month.toString().padLeft(2, '0')}-${_purchaseDate!.day.toString().padLeft(2, '0')}'
          : null;
      if (_editingId != null) {
        await Supabase.instance.client.from('investments').update({
          'symbol': _symbolCtrl.text.toUpperCase(),
          'name': _nameCtrl.text.isEmpty
              ? _symbolCtrl.text.toUpperCase()
              : _nameCtrl.text,
          'shares': double.tryParse(_sharesCtrl.text) ?? 0,
          'avg_buy_price': double.tryParse(_avgPriceCtrl.text) ?? 0,
          'current_price': double.tryParse(_currentPriceCtrl.text) ?? 0,
          'is_halal': _isHalal,
          'purchase_date': purchaseDateStr,
        }).eq('id', _editingId!);
      } else {
        await Supabase.instance.client.from('investments').insert({
          'user_id': user.id,
          'symbol': _symbolCtrl.text.toUpperCase(),
          'name': _nameCtrl.text.isEmpty
              ? _symbolCtrl.text.toUpperCase()
              : _nameCtrl.text,
          'shares': double.tryParse(_sharesCtrl.text) ?? 0,
          'avg_buy_price': double.tryParse(_avgPriceCtrl.text) ?? 0,
          'current_price': double.tryParse(_currentPriceCtrl.text) ?? 0,
          'is_halal': _isHalal,
          'type': 'etf',
          'currency': 'USD',
          'purchase_date': purchaseDateStr,
        });
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
        Navigator.pop(context);
        widget.onSaved();
      }
    }
  }

  TextField _field(
      TextEditingController ctrl, String hint, TextInputType type) {
    return TextField(
      controller: ctrl,
      keyboardType: type,
      textAlign: TextAlign.right,
      style: TextStyle(
          color: Theme.of(context).colorScheme.onSurface),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(
            color: Theme.of(context).colorScheme.onSurfaceVariant),
        filled: true,
        fillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: BorderSide.none),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 20,
          right: 20,
          top: 20),
      child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.outlineVariant,
                borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 16),
        Text('inv_new'.tr(),
            style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Theme.of(context).colorScheme.onSurface)),
        const SizedBox(height: 20),
        Row(children: [
          Expanded(child: _field(_symbolCtrl, 'inv_symbol_hint'.tr(), TextInputType.text)),
          const SizedBox(width: 8),
          IconButton(
            onPressed: _fetchingPrice ? null : _fetchLivePrice,
            icon: _fetchingPrice
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : Icon(Icons.download, color: Theme.of(context).colorScheme.primary),
            tooltip: 'inv_fetch_price'.tr(),
          ),
        ]),
        const SizedBox(height: 10),
        _field(_nameCtrl, 'inv_name_hint'.tr(), TextInputType.text),
        const SizedBox(height: 10),
        _field(_sharesCtrl, 'inv_shares_hint'.tr(),
            const TextInputType.numberWithOptions(decimal: true)),
        const SizedBox(height: 10),
        _field(_avgPriceCtrl, 'inv_avg_price_hint'.tr(),
            const TextInputType.numberWithOptions(decimal: true)),
        const SizedBox(height: 10),
        _field(_currentPriceCtrl, 'inv_current_price_hint'.tr(),
            const TextInputType.numberWithOptions(decimal: true)),
        const SizedBox(height: 10),
        GestureDetector(
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: _purchaseDate ?? DateTime.now(),
              firstDate: DateTime(2000),
              lastDate: DateTime.now(),
              helpText: 'inv_purchase_date'.tr(),
            );
            if (picked != null) setState(() => _purchaseDate = picked);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(children: [
              Icon(Icons.calendar_today, size: 18, color: Theme.of(context).colorScheme.primary),
              const SizedBox(width: 10),
              Expanded(child: Text(
                _purchaseDate != null
                    ? '${_purchaseDate!.day}/${_purchaseDate!.month}/${_purchaseDate!.year}'
                    : 'inv_purchase_date_hint'.tr(),
                style: TextStyle(
                  color: _purchaseDate != null
                      ? Theme.of(context).colorScheme.onSurface
                      : Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              )),
              if (_purchaseDate != null)
                GestureDetector(
                  onTap: () => setState(() => _purchaseDate = null),
                  child: Icon(Icons.close, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
            ]),
          ),
        ),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () => setState(() => _isHalal = !_isHalal),
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _isHalal
                  ? (Theme.of(context).brightness == Brightness.dark
                          ? const Color(0xFF10B981)
                          : const Color(0xFF10B981))
                      .withValues(alpha: 0.1)
                  : Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: _isHalal
                      ? (Theme.of(context).brightness == Brightness.dark
                              ? const Color(0xFF10B981)
                              : const Color(0xFF10B981))
                          .withValues(alpha: 0.4)
                      : Theme.of(context).colorScheme.outlineVariant),
            ),
            child: Row(children: [
              Icon(_isHalal ? Icons.check_circle : Icons.circle_outlined,
                  color: _isHalal
                      ? const Color(0xFF10B981)
                      : const Color(0xFF64748B),
                  size: 20),
              const SizedBox(width: 10),
              Text('inv_halal'.tr(),
                  style: TextStyle(
                      color: _isHalal
                          ? const Color(0xFF10B981)
                          : const Color(0xFF94A3B8),
                      fontWeight: FontWeight.w700)),
            ]),
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _saving ? null : _addInvestment,
              style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Theme.of(context).colorScheme.onPrimary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12))),
              child: _saving
                  ? CircularProgressIndicator(
                      color: Theme.of(context).colorScheme.onPrimary,
                      strokeWidth: 2)
                  : Text('inv_save'.tr(),
                      style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 15)),
            )),
        const SizedBox(height: 16),
      ])),
    );
  }
}
