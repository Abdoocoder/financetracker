import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

// ─────────────────────────────────────────────────────────────────────────────
// PdfReportService — generates a monthly financial report as PDF
// Usage:
//   await PdfReportService.shareMonthlyReport(data: ReportData(...));
// ─────────────────────────────────────────────────────────────────────────────

class ReportData {
  final String userName;
  final String currency;
  final int month;
  final int year;
  final double income;
  final double expenses;
  final double debtPayments;
  final List<Map<String, dynamic>> transactions;
  final List<Map<String, dynamic>> debts;

  const ReportData({
    required this.userName,
    required this.currency,
    required this.month,
    required this.year,
    required this.income,
    required this.expenses,
    required this.debtPayments,
    required this.transactions,
    required this.debts,
  });
}

class PdfReportService {
  // Arabic month names
  static const _monthsAr = [
    'يناير','فبراير','مارس','أبريل','مايو','يونيو',
    'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر',
  ];

  // Brand colors
  static const _green  = PdfColor.fromInt(0xFF10B981);
  static const _red    = PdfColor.fromInt(0xFFEF4444);
  static const _blue   = PdfColor.fromInt(0xFF3B7EF6);
  static const _bg     = PdfColor.fromInt(0xFFF8FAFC);
  static const _card   = PdfColors.white;
  static const _text   = PdfColor.fromInt(0xFF0F172A);
  static const _muted  = PdfColor.fromInt(0xFF64748B);
  static const _border = PdfColor.fromInt(0xFFE2E8F0);

  static Future<void> shareMonthlyReport({required ReportData data}) async {
    // Load Cairo font
    final regularData = await rootBundle.load('assets/fonts/Cairo-Regular.ttf');
    final boldData    = await rootBundle.load('assets/fonts/Cairo-Bold.ttf');
    final regular = pw.Font.ttf(regularData);
    final bold    = pw.Font.ttf(boldData);

    final doc = pw.Document(
      title: 'تقرير فجرك — ${_monthsAr[data.month - 1]} ${data.year}',
      author: data.userName,
    );

    // ── Pre-compute data ──────────────────────────────────────────────────────
    const debtCats = ['ديون', 'debts_title', 'Debts'];
    final realExpenses = data.expenses - data.debtPayments;
    final saved = data.income - data.expenses;
    final savingsRate = data.income > 0
        ? (saved / data.income * 100).clamp(0, 100).round()
        : 0;

    // Category breakdown (expenses only, excluding debts)
    final catMap = <String, double>{};
    for (final tx in data.transactions) {
      if (tx['type'] == 'expense' && !debtCats.contains(tx['category'])) {
        final cat = (tx['category'] as String?) ?? '—';
        catMap[cat] = (catMap[cat] ?? 0) + (tx['amount'] as num).toDouble();
      }
    }
    final topCats = catMap.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final top5 = topCats.take(5).toList();
    final maxCat = top5.isNotEmpty ? top5.first.value : 1.0;

    // ── Text styles ───────────────────────────────────────────────────────────
    pw.TextStyle ts(double size, {bool isBold = false, PdfColor? color}) =>
        pw.TextStyle(
          font: isBold ? bold : regular,
          fontSize: size,
          color: color ?? _text,
        );

    String fmt(double n) =>
        n.abs().toStringAsFixed(n.abs() < 1000 ? 2 : 0);

    // ── Page ──────────────────────────────────────────────────────────────────
    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        textDirection: pw.TextDirection.rtl,
        build: (ctx) => [

          // ── HEADER ──────────────────────────────────────────────────────────
          pw.Container(
            padding: const pw.EdgeInsets.all(20),
            decoration: pw.BoxDecoration(
              color: _blue,
              borderRadius: pw.BorderRadius.circular(12),
            ),
            child: pw.Directionality(
              textDirection: pw.TextDirection.rtl,
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('فجرك 🌅',
                          style: ts(22, isBold: true, color: PdfColors.white)),
                      pw.SizedBox(height: 4),
                      pw.Text(
                          'التقرير الشهري — ${_monthsAr[data.month - 1]} ${data.year}',
                          style: ts(13, color: const PdfColor(1, 1, 1, 0.75))),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(data.userName, style: ts(13, isBold: true, color: PdfColors.white)),
                      pw.Text(data.currency,  style: ts(11, color: const PdfColor(1, 1, 1, 0.75))),
                    ],
                  ),
                ],
              ),
            ),
          ),

          pw.SizedBox(height: 20),

          // ── SUMMARY CARDS ────────────────────────────────────────────────────
          pw.Directionality(
            textDirection: pw.TextDirection.rtl,
            child: pw.Row(
              children: [
                _summaryCard('الدخل',     '+${fmt(data.income)}',    _green, data.currency, bold, regular),
                pw.SizedBox(width: 10),
                _summaryCard('المصاريف',  '-${fmt(realExpenses)}',   _red,   data.currency, bold, regular),
                pw.SizedBox(width: 10),
                _summaryCard(
                  saved >= 0 ? 'وفّرت' : 'عجز',
                  '${saved >= 0 ? '+' : '-'}${fmt(saved)}',
                  saved >= 0 ? _green : _red,
                  data.currency, bold, regular,
                ),
                pw.SizedBox(width: 10),
                _summaryCard('نسبة الادخار', '$savingsRate%', _blue, 'من الدخل', bold, regular),
              ],
            ),
          ),

          pw.SizedBox(height: 20),

          // ── DEBT PAYMENTS (if any) ───────────────────────────────────────────
          if (data.debtPayments > 0) ...[
            _sectionTitle('أقساط الديون هذا الشهر', bold),
            pw.SizedBox(height: 8),
            pw.Directionality(
              textDirection: pw.TextDirection.rtl,
              child: pw.Container(
                padding: const pw.EdgeInsets.all(14),
                decoration: pw.BoxDecoration(
                  color: const PdfColor.fromInt(0xFFEFF6FF),
                  borderRadius: pw.BorderRadius.circular(8),
                  border: pw.Border.all(color: _blue, width: 0.5),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('💳 إجمالي أقساط الديون المدفوعة', style: ts(11)),
                    pw.Text('${fmt(data.debtPayments)} ${data.currency}',
                        style: ts(12, isBold: true, color: _blue)),
                  ],
                ),
              ),
            ),
            pw.SizedBox(height: 20),
          ],

          // ── TOP CATEGORIES ───────────────────────────────────────────────────
          if (top5.isNotEmpty) ...[
            _sectionTitle('أبرز فئات الإنفاق', bold),
            pw.SizedBox(height: 10),
            pw.Directionality(
              textDirection: pw.TextDirection.rtl,
              child: pw.Column(
                children: top5.map((e) {
                  final pct = (e.value / maxCat).clamp(0.0, 1.0);
                  return pw.Padding(
                    padding: const pw.EdgeInsets.only(bottom: 8),
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text(e.key, style: ts(10)),
                            pw.Text('${fmt(e.value)} ${data.currency}',
                                style: ts(10, isBold: true)),
                          ],
                        ),
                        pw.SizedBox(height: 4),
                        pw.LayoutBuilder(
                          builder: (ctx, constraints) {
                            final w = constraints?.maxWidth ?? 400.0;
                            return pw.Stack(children: [
                              pw.Container(
                                height: 8, width: w,
                                decoration: pw.BoxDecoration(
                                  color: _border,
                                  borderRadius: pw.BorderRadius.circular(4),
                                ),
                              ),
                              pw.Container(
                                height: 8, width: w * pct,
                                decoration: pw.BoxDecoration(
                                  color: _red,
                                  borderRadius: pw.BorderRadius.circular(4),
                                ),
                              ),
                            ]);
                          },
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
            pw.SizedBox(height: 20),
          ],

          // ── TRANSACTIONS TABLE ───────────────────────────────────────────────
          _sectionTitle('جميع المعاملات (${data.transactions.length})', bold),
          pw.SizedBox(height: 10),
          pw.Directionality(
            textDirection: pw.TextDirection.rtl,
            child: pw.Table(
              border: pw.TableBorder(
                horizontalInside: pw.BorderSide(color: _border, width: 0.5),
                bottom: pw.BorderSide(color: _border, width: 0.5),
              ),
              columnWidths: {
                0: const pw.FlexColumnWidth(2.5), // التاريخ
                1: const pw.FlexColumnWidth(3.5), // الوصف
                2: const pw.FlexColumnWidth(2),   // الفئة
                3: const pw.FlexColumnWidth(2),   // المبلغ
              },
              children: [
                // Header row
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: _bg),
                  children: ['التاريخ', 'الوصف', 'الفئة', 'المبلغ']
                      .map((h) => _tableCell(h, bold, isHeader: true))
                      .toList(),
                ),
                // Data rows
                ...data.transactions.map((tx) {
                  final isIncome = tx['type'] == 'income';
                  final amount   = (tx['amount'] as num).toDouble();
                  final amtStr   = '${isIncome ? '+' : '-'}${fmt(amount)} ${data.currency}';
                  final date     = (tx['transaction_date'] as String? ?? '').replaceAll('-', '/');
                  final desc     = (tx['description'] as String? ?? '—');
                  final cat      = (tx['category']    as String? ?? '—');

                  return pw.TableRow(children: [
                    _tableCell(date, regular, color: _muted),
                    _tableCell(desc, regular),
                    _tableCell(cat,  regular, color: _muted),
                    _tableCell(amtStr, bold,
                        color: isIncome ? _green : _red,
                        align: pw.TextAlign.left),
                  ]);
                }),
              ],
            ),
          ),

          pw.SizedBox(height: 20),

          // ── ACTIVE DEBTS ─────────────────────────────────────────────────────
          if (data.debts.isNotEmpty) ...[
            _sectionTitle('الديون النشطة (${data.debts.length})', bold),
            pw.SizedBox(height: 10),
            pw.Directionality(
              textDirection: pw.TextDirection.rtl,
              child: pw.Table(
                border: pw.TableBorder(
                  horizontalInside: pw.BorderSide(color: _border, width: 0.5),
                ),
                columnWidths: {
                  0: const pw.FlexColumnWidth(3),
                  1: const pw.FlexColumnWidth(2),
                  2: const pw.FlexColumnWidth(2),
                  3: const pw.FlexColumnWidth(2),
                },
                children: [
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: _bg),
                    children: ['اسم الدين', 'المتبقي', 'القسط/شهر', 'تلقائي']
                        .map((h) => _tableCell(h, bold, isHeader: true))
                        .toList(),
                  ),
                  ...data.debts.map((d) {
                    final remaining = (d['remaining_amount'] as num? ?? 0).toDouble();
                    final monthly   = (d['monthly_payment']  as num? ?? 0).toDouble();
                    final auto      = d['auto_deduct'] == true ? '✓' : '—';
                    return pw.TableRow(children: [
                      _tableCell(d['name'] as String? ?? '—', regular),
                      _tableCell('${fmt(remaining)} ${data.currency}', regular, color: _red),
                      _tableCell(monthly > 0 ? '${fmt(monthly)} ${data.currency}' : '—', regular),
                      _tableCell(auto, bold, color: auto == '✓' ? _green : _muted),
                    ]);
                  }),
                ],
              ),
            ),
            pw.SizedBox(height: 20),
          ],

          // ── FOOTER ────────────────────────────────────────────────────────────
          pw.Divider(color: _border),
          pw.SizedBox(height: 8),
          pw.Directionality(
            textDirection: pw.TextDirection.rtl,
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('تم إنشاء هذا التقرير بواسطة فجرك 🌅',
                    style: ts(9, color: _muted)),
                pw.Text(
                  DateTime.now().toIso8601String().split('T')[0].replaceAll('-', '/'),
                  style: ts(9, color: _muted),
                ),
              ],
            ),
          ),
        ],
      ),
    );

    final bytes = await doc.save();
    final filename = 'fajrak_${data.year}_${data.month.toString().padLeft(2, '0')}.pdf';
    await Printing.sharePdf(bytes: bytes, filename: filename);
  }

  // ── Helper widgets ──────────────────────────────────────────────────────────

  static pw.Widget _summaryCard(
    String label, String value, PdfColor color,
    String sub, pw.Font bold, pw.Font regular,
  ) {
    return pw.Expanded(
      child: pw.Container(
        padding: const pw.EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: pw.BoxDecoration(
          color: _card,
          borderRadius: pw.BorderRadius.circular(8),
          border: pw.Border.all(color: _border),
        ),
        child: pw.Directionality(
          textDirection: pw.TextDirection.rtl,
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text(label,
                  style: pw.TextStyle(font: regular, fontSize: 9, color: _muted),
                  textAlign: pw.TextAlign.center),
              pw.SizedBox(height: 4),
              pw.Text(value,
                  style: pw.TextStyle(font: bold, fontSize: 13, color: color),
                  textAlign: pw.TextAlign.center),
              pw.SizedBox(height: 2),
              pw.Text(sub,
                  style: pw.TextStyle(font: regular, fontSize: 8, color: _muted),
                  textAlign: pw.TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }

  static pw.Widget _sectionTitle(String title, pw.Font bold) {
    return pw.Directionality(
      textDirection: pw.TextDirection.rtl,
      child: pw.Row(children: [
        pw.Container(width: 4, height: 18,
            decoration: pw.BoxDecoration(
                color: _blue, borderRadius: pw.BorderRadius.circular(2))),
        pw.SizedBox(width: 8),
        pw.Text(title,
            style: pw.TextStyle(font: bold, fontSize: 13, color: _text)),
      ]),
    );
  }

  static pw.Widget _tableCell(
    String text, pw.Font font, {
    bool isHeader = false,
    PdfColor? color,
    pw.TextAlign align = pw.TextAlign.right,
  }) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      child: pw.Text(
        text,
        style: pw.TextStyle(
          font: font,
          fontSize: isHeader ? 10 : 9,
          color: color ?? (isHeader ? _text : _text),
          fontWeight: isHeader ? pw.FontWeight.bold : pw.FontWeight.normal,
        ),
        textAlign: align,
        textDirection: pw.TextDirection.rtl,
      ),
    );
  }
}
