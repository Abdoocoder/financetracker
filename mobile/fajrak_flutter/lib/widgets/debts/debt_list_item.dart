import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../utils/error_handler.dart';

class DebtListItem extends StatefulWidget {
  final Map<String, dynamic> debt;
  final String currency;
  final List<Color> priorityColors;
  final List<String> priorityLabels;
  final Function(Map<String, dynamic>) onEdit;
  final Function(String) onDelete;
  final VoidCallback onPaymentComplete;
  final Function(String) onCelebration;

  const DebtListItem({
    super.key,
    required this.debt,
    required this.currency,
    required this.priorityColors,
    required this.priorityLabels,
    required this.onEdit,
    required this.onDelete,
    required this.onPaymentComplete,
    required this.onCelebration,
  });

  @override
  State<DebtListItem> createState() => _DebtListItemState();
}

class _DebtListItemState extends State<DebtListItem> {
  bool _isPaying = false;
  bool _payingSaving = false;
  final _paymentCtrl = TextEditingController();

  @override
  void dispose() {
    _paymentCtrl.dispose();
    super.dispose();
  }

  Future<void> _makePayment() async {
    final amount = double.tryParse(_paymentCtrl.text);
    if (amount == null || amount <= 0) return;
    setState(() => _payingSaving = true);
    
    try {
      final newRemaining = ((widget.debt['remaining_amount'] as num).toDouble() - amount)
          .clamp(0.0, double.infinity);
          
      await Supabase.instance.client.from('debts').update({
        'remaining_amount': newRemaining,
        'is_paid': newRemaining == 0,
      }).eq('id', widget.debt['id']);
      
      _paymentCtrl.clear();
      setState(() {
        _payingSaving = false;
        _isPaying = false;
      });
      
      if (newRemaining == 0) {
        widget.onCelebration(widget.debt['name'] as String);
      }
      widget.onPaymentComplete();
    } catch (e) {
      if (mounted) {
        setState(() => _payingSaving = false);
        ErrorHandler.handle(e, context: context, developerMessage: 'Debt Payment');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final original = (widget.debt['original_amount'] as num).toDouble();
    final remaining = (widget.debt['remaining_amount'] as num).toDouble();
    final pct = original > 0 ? ((original - remaining) / original * 100) : 0.0;
    final priorityIndex = ((widget.debt['priority'] as int?) ?? 3) - 1;
    final prioColor = widget.priorityColors[priorityIndex.clamp(0, 4)];

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1629),
        borderRadius: BorderRadius.circular(15),
        border: Border(
          left: BorderSide(color: prioColor, width: 3),
          top: const BorderSide(color: Color(0xFF1E293B)),
          right: const BorderSide(color: Color(0xFF1E293B)),
          bottom: const BorderSide(color: Color(0xFF1E293B)),
        ),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
                color: prioColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8)),
            child: Center(
                child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: prioColor,
                        boxShadow: [
                          BoxShadow(
                              color: prioColor.withValues(alpha: 0.5), blurRadius: 6)
                        ]))),
          ),
          const SizedBox(width: 10),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(widget.debt['name'] ?? '',
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'Cairo',
                        fontSize: 14)),
                if (widget.debt['notes'] != null &&
                    (widget.debt['notes'] as String).isNotEmpty)
                  Text(widget.debt['notes'],
                      style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 11,
                          fontFamily: 'Cairo'),
                      overflow: TextOverflow.ellipsis),
              ])),
          Text('${remaining.toStringAsFixed(0)} ${widget.currency}',
              style: const TextStyle(
                  color: Color(0xFFEF4444),
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Cairo',
                  fontSize: 15)),
          const SizedBox(width: 8),
          GestureDetector(
              onTap: () => widget.onEdit(widget.debt),
              child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                      color: const Color(0xFF3B7EF6).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(
                          color: const Color(0xFF3B7EF6).withValues(alpha: 0.2))),
                  child: const Icon(Icons.edit,
                      color: Color(0xFF3B7EF6), size: 14))),
          const SizedBox(width: 6),
          GestureDetector(
              onTap: () => widget.onDelete(widget.debt['id'].toString()),
              child: Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(7),
                      border: Border.all(
                          color: const Color(0xFFEF4444).withValues(alpha: 0.2))),
                  child: const Icon(Icons.close,
                      color: Color(0xFFEF4444), size: 14))),
        ]),
        const SizedBox(height: 10),
        ClipRRect(
            borderRadius: BorderRadius.circular(5),
            child: LinearProgressIndicator(
                value: (pct / 100).clamp(0.0, 1.0),
                backgroundColor: const Color(0xFF1E293B),
                color: const Color(0xFF10B981),
                minHeight: 8)),
        const SizedBox(height: 8),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('${pct.toStringAsFixed(0)}% مسدد',
              style: const TextStyle(
                  color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'Cairo')),
          Row(children: [
            if ((widget.debt['monthly_payment'] as num).toDouble() > 0)
              Text('${(widget.debt['monthly_payment'] as num).toStringAsFixed(0)}/شهر',
                  style: const TextStyle(
                      color: Color(0xFF64748B),
                      fontSize: 11,
                      fontFamily: 'Cairo')),
            if (widget.debt['payment_day'] != null) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                    color: const Color(0xFF3B7EF6).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6)),
                child: Text('يوم ${widget.debt['payment_day']}',
                    style: const TextStyle(
                        color: Color(0xFF3B7EF6),
                        fontSize: 10,
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w700)),
              ),
            ],
            if (widget.debt['due_date'] != null) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6)),
                child: Text(
                    '📅 ${(widget.debt['due_date'] as String).substring(0, 10)}',
                    style: const TextStyle(
                        color: Color(0xFFF59E0B),
                        fontSize: 10,
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.w700)),
              ),
            ],
          ]),
        ]),
        const SizedBox(height: 8),
        
        // Payment row
        if (_isPaying)
          Row(children: [
            Expanded(
                child: TextField(
              controller: _paymentCtrl,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(
                  color: Colors.white, fontSize: 13, fontFamily: 'Cairo'),
              textAlign: TextAlign.center,
              decoration: InputDecoration(
                  hintText: 'المبلغ',
                  hintStyle: const TextStyle(color: Color(0xFF64748B)),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide.none),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
              autofocus: true,
            )),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: _payingSaving ? null : _makePayment,
              child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(8)),
                  child: Text(_payingSaving ? '⏳' : '✓ دفع',
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'Cairo'))),
            ),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: () {
                setState(() {
                  _isPaying = false;
                  _paymentCtrl.clear();
                });
              },
              child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(8)),
                  child: const Text('✕',
                      style:
                          TextStyle(color: Color(0xFF94A3B8), fontSize: 12))),
            ),
          ])
        else
          Align(
            alignment: Alignment.centerLeft,
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _isPaying = true;
                  _paymentCtrl.clear();
                });
              },
              child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                  decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: const Color(0xFF10B981).withValues(alpha: 0.2))),
                  child: const Text('+ دفعة',
                      style: TextStyle(
                          color: Color(0xFF6EE7B7),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'Cairo'))),
            ),
          ),
      ]),
    );
  }
}
