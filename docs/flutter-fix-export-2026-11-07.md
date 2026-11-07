# Flutter Export Fixes — 2026-11-07

**Fixed:** Critical PDF and CSV export defects in the Fajrak Flutter app (`mobile/fajrak_flutter/`)

---

## Summary of Changes

### PDF Report Fixes (`lib/services/pdf_report_service.dart`)

| Issue | Root Cause | Fix |
|-------|------------|-----|
| **Missing Description/Category in Transactions Table** | Null/empty strings in database not handled properly; fallback showed '—' | Added proper null/empty checks with `.trim()` and fallbacks to '—' for display |
| **Empty Category Breakdown** | Category aggregation didn't handle empty/null categories; debt category filter was case-sensitive | Added `.trim()` and empty check; use 'Uncategorized' for missing categories; filter excludes debt categories correctly |
| **Debt Table RTL Layout Broken** | Text merging in RTL; no vertical borders; no text alignment | Added `verticalInside` borders; explicit `textAlign: pw.TextAlign.center` for numeric columns; `textDirection: pw.TextDirection.rtl` on table wrapper |

**Code Changes:**
- Enhanced category aggregation to handle null/empty categories with 'Uncategorized' fallback
- Improved transaction table cell data extraction with proper null/empty handling
- Fixed debt table RTL layout with vertical borders and center alignment for numeric columns
- Added `ReportData.legacy()` factory for backward compatibility
- Added `monthStart`/`monthEnd` fields to `ReportData` for future filtering support

---

### CSV Export Fixes (`lib/widgets/settings/export_delete_section.dart`)

| Issue | Root Cause | Fix |
|-------|------------|-----|
| **Wrong File Extension/MIME Type** | `XFile` created without `mimeType: 'text/csv'`; share sheet couldn't identify file type | Added `mimeType: 'text/csv'` to `XFile` |
| **Unclear Filename** | Used timestamp only (`millisecondsSinceEpoch`) | Changed to `fajrak_transactions_YYYYMMDD_HHMM.csv` format |
| **Incomplete Data** | Only exported basic fields (date, type, amount, category, description) | Added `original_amount`, `original_currency`, `exchange_rate` columns |

**Code Changes:**
- Added `mimeType: 'text/csv'` to `XFile` for proper file type detection
- Filename format: `fajrak_transactions_YYYYMMDD_HHMM.csv`
- Extended CSV columns: Date, Type, Amount, Original Amount, Original Currency, Exchange Rate, Category, Description
- Proper CSV escaping for commas in description/category fields

---

### i18n Updates (`assets/i18n/en.json`, `assets/i18n/ar.json`)

| Key | English | Arabic |
|-----|---------|--------|
| `cat_uncategorized` | Uncategorized | غير مصنف |

**Parity Maintained:** 1064 keys in both files.

---

## Verification

| Check | Result |
|-------|--------|
| `flutter analyze` | ✅ No issues |
| `flutter test` | ✅ 347/347 passing |
| i18n parity (en/ar) | ✅ 1064 keys identical |
| Makefile Firebase grep | ✅ Unchanged (Rule #9 respected) |
| Zakat logic in RPCs only | ✅ Unchanged |
| Phase 1-3 fixes preserved | ✅ Verified |

---

## Files Modified (6)

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `lib/services/pdf_report_service.dart` | ~80 | PDF layout fixes, category handling, RTL debt table |
| `lib/widgets/settings/export_delete_section.dart` | ~40 | CSV mimeType, filename, extended columns |
| `lib/screens/transactions/transactions_screen.dart` | 1 | Use `ReportData.legacy()` factory |
| `assets/i18n/en.json` | +1 | "Uncategorized" key |
| `assets/i18n/ar.json` | +1 | "غير مصنف" key |
| `pubspec.lock` | auto | Lock file update |

---

## Technical Details

### PDF Category Breakdown Logic
```dart
// Before: cat = (tx['category'] as String?) ?? '—'
// After: 
final catRaw = (tx['category'] as String?)?.trim();
final cat = (catRaw != null && catRaw.isNotEmpty) ? catRaw : _uncategorizedEn;
```

### Debt Table RTL Fix
```dart
// Added vertical borders and center alignment for numeric columns
border: const pw.TableBorder(
  horizontalInside: pw.BorderSide(color: _border, width: 0.5),
  verticalInside: pw.BorderSide(color: _border, width: 0.5),
),
columnWidths: { ... },
children: [
  _tableCell(value, regular, align: pw.TextAlign.center), // for numeric cols
]
```

### CSV Export MIME Type
```dart
// Before:
files: [XFile(file.path)],

// After:
files: [XFile(file.path, mimeType: 'text/csv')],
```

---

## All Export Issues Resolved

| Feature | Before | After |
|---------|--------|-------|
| PDF Transaction Description | Shows '—' for most | Shows actual description or '—' |
| PDF Transaction Category | Shows '—' for most | Shows actual category or 'Uncategorized' |
| PDF Category Breakdown | Empty (only total) | Top 5 categories with bars & amounts |
| PDF Debt Table | Text merged, unreadable | Clean RTL layout with vertical borders |
| CSV File Extension | `.txt` (misidentified) | `.csv` with correct MIME type |
| CSV Filename | Random timestamp | `fajrak_transactions_YYYYMMDD_HHMM.csv` |
| CSV Columns | 5 basic fields | 8 fields including multi-currency data |

---

**Status:** All critical export defects fixed. Ready for release.