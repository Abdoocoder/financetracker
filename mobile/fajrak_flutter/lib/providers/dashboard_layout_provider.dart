import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum DashCardId {
  monthSummary,
  heroBalance,
  monthlyStats,
  quickAdd,    // required — cannot be hidden
  recentTx,
  netWorth,
  healthScore,
  stage,
  charts,
  budgets,
  quickLinks,
  gamification,
  simulator,
  challenges,
}

class DashCardConfig {
  final DashCardId id;
  final String labelKey;
  final bool defaultVisible;
  final bool required;

  const DashCardConfig({
    required this.id,
    required this.labelKey,
    this.defaultVisible = true,
    this.required = false,
  });
}

const List<DashCardConfig> kDashCards = [
  DashCardConfig(id: DashCardId.monthSummary,  labelKey: 'dash_card_month_summary',  defaultVisible: true),
  DashCardConfig(id: DashCardId.heroBalance,   labelKey: 'dash_card_hero_balance',   defaultVisible: true),
  DashCardConfig(id: DashCardId.monthlyStats,  labelKey: 'dash_card_monthly_stats',  defaultVisible: true),
  DashCardConfig(id: DashCardId.quickAdd,      labelKey: 'dash_card_quick_add',      defaultVisible: true,  required: true),
  DashCardConfig(id: DashCardId.recentTx,      labelKey: 'dash_card_recent_tx',      defaultVisible: true),
  DashCardConfig(id: DashCardId.netWorth,      labelKey: 'dash_card_net_worth',      defaultVisible: true),
  DashCardConfig(id: DashCardId.healthScore,   labelKey: 'dash_card_health_score',   defaultVisible: true),
  DashCardConfig(id: DashCardId.stage,         labelKey: 'dash_card_stage',          defaultVisible: true),
  DashCardConfig(id: DashCardId.budgets,       labelKey: 'dash_card_budgets',        defaultVisible: false),
  DashCardConfig(id: DashCardId.quickLinks,    labelKey: 'dash_card_quick_links',    defaultVisible: false),
  DashCardConfig(id: DashCardId.charts,        labelKey: 'dash_card_charts',         defaultVisible: false),
  DashCardConfig(id: DashCardId.gamification,  labelKey: 'dash_card_gamification',   defaultVisible: false),
  DashCardConfig(id: DashCardId.simulator,     labelKey: 'dash_card_simulator',      defaultVisible: false),
  DashCardConfig(id: DashCardId.challenges,    labelKey: 'dash_card_challenges',     defaultVisible: false),
];

const _kPrefsKey = 'dashboard_layout_v1';

class DashboardLayoutProvider extends ChangeNotifier {
  final Map<DashCardId, bool> _visibility = {};
  bool _loaded = false;

  bool get loaded => _loaded;

  DashboardLayoutProvider() {
    _init();
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kPrefsKey);
    if (raw != null) {
      // stored as comma-separated "id:1" pairs
      final parts = raw.split(',');
      for (final part in parts) {
        final kv = part.split(':');
        if (kv.length == 2) {
          final idx = int.tryParse(kv[0]);
          final val = kv[1] == '1';
          if (idx != null && idx < DashCardId.values.length) {
            _visibility[DashCardId.values[idx]] = val;
          }
        }
      }
    }
    // Merge with defaults for any cards not in storage
    for (final cfg in kDashCards) {
      _visibility.putIfAbsent(cfg.id, () => cfg.defaultVisible);
    }
    _loaded = true;
    notifyListeners();
  }

  bool isVisible(DashCardId id) {
    if (!_loaded) {
      // Return default while loading (avoids flicker of wrong layout)
      return kDashCards.firstWhere((c) => c.id == id).defaultVisible;
    }
    return _visibility[id] ?? true;
  }

  int get visibleOptionalCount =>
      kDashCards.where((c) => !c.required && (_visibility[c.id] ?? c.defaultVisible)).length;

  int get totalOptionalCount => kDashCards.where((c) => !c.required).length;

  void toggle(DashCardId id) {
    final cfg = kDashCards.firstWhere((c) => c.id == id);
    if (cfg.required) return;

    final current = _visibility[id] ?? cfg.defaultVisible;
    // Guard: prevent hiding last optional card
    if (current && visibleOptionalCount <= 1) return;

    _visibility[id] = !current;
    notifyListeners();
    _persist();
  }

  void reset() {
    for (final cfg in kDashCards) {
      _visibility[cfg.id] = cfg.defaultVisible;
    }
    notifyListeners();
    _persist();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = _visibility.entries
        .map((e) => '${e.key.index}:${e.value ? 1 : 0}')
        .join(',');
    await prefs.setString(_kPrefsKey, encoded);
  }
}
