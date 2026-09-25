import { act, renderHook } from '@testing-library/react';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';

const STORAGE_KEY = 'dashboard_layout_v1';

const REQUIRED_CARD = 'quick_add';

const DEFAULT_VISIBLE = [
  'month_summary',
  'hero_balance',
  'monthly_stats',
  'debt_row',
  'quick_add',
  'recent_tx',
  'budgets',
  'quick_links',
  'net_worth',
];

const DEFAULT_HIDDEN = ['health', 'achievements', 'charts', 'simulator', 'challenges'];

const readStored = (): Record<string, boolean> | null => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
};

describe('useDashboardLayout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hydrates to default visibility when nothing is stored', () => {
    const { result } = renderHook(() => useDashboardLayout());

    expect(result.current.hydrated).toBe(true);
    for (const id of DEFAULT_VISIBLE) {
      expect(result.current.visibility[id]).toBe(true);
    }
    for (const id of DEFAULT_HIDDEN) {
      expect(result.current.visibility[id]).toBe(false);
    }
    expect(result.current.show('quick_add')).toBe(true);
  });

  it('toggle flips a card visibility and persists the layout', () => {
    const { result } = renderHook(() => useDashboardLayout());

    act(() => {
      result.current.toggle('health');
    });

    expect(result.current.visibility.health).toBe(true);
    expect(result.current.show('health')).toBe(true);
    expect(readStored()).toMatchObject({ health: true });
  });

  it('toggle does not change required cards', () => {
    const { result } = renderHook(() => useDashboardLayout());

    act(() => {
      result.current.toggle(REQUIRED_CARD);
    });

    expect(result.current.visibility.quick_add).toBe(true);
    expect(readStored()).toBeNull();
  });

  it('toggle prevents hiding the last visible non-required card', () => {
    const { result } = renderHook(() => useDashboardLayout());

    const hideable = DEFAULT_VISIBLE.filter((id) => id !== REQUIRED_CARD);

    act(() => {
      hideable.slice(0, 7).forEach((id) => result.current.toggle(id));
    });
    expect(result.current.visibility.net_worth).toBe(true);

    act(() => {
      result.current.toggle('net_worth');
    });

    expect(result.current.visibility.net_worth).toBe(true);
    expect(readStored()).toMatchObject({ net_worth: true });
  });

  it('reset restores default visibility and persists it', () => {
    const { result } = renderHook(() => useDashboardLayout());

    act(() => {
      result.current.toggle('health');
      result.current.toggle('net_worth');
    });
    expect(result.current.visibility.health).toBe(true);
    expect(result.current.visibility.net_worth).toBe(false);

    act(() => {
      result.current.reset();
    });

    expect(result.current.visibility.health).toBe(false);
    expect(result.current.visibility.net_worth).toBe(true);
    expect(result.current.show('net_worth')).toBe(true);
    expect(readStored()).toMatchObject({ health: false, net_worth: true });
  });

  it('loads a persisted layout merged over defaults', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ health: true }));

    const { result } = renderHook(() => useDashboardLayout());

    expect(result.current.visibility.health).toBe(true);
    expect(result.current.visibility.month_summary).toBe(true);
    expect(result.current.visibility.charts).toBe(false);
  });

  it('falls back to defaults when stored layout is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json {{');

    const { result } = renderHook(() => useDashboardLayout());

    for (const id of DEFAULT_VISIBLE) {
      expect(result.current.visibility[id]).toBe(true);
    }
  });

  it('persists via a state change across mounts', () => {
    const first = renderHook(() => useDashboardLayout());

    act(() => {
      first.result.current.toggle('budgets');
    });
    first.unmount();

    const second = renderHook(() => useDashboardLayout());
    expect(second.result.current.visibility.budgets).toBe(false);
  });

  it('swallows setItem errors without breaking state updates', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() => useDashboardLayout());

    act(() => {
      result.current.toggle('achievements');
    });

    expect(result.current.visibility.achievements).toBe(true);
    expect(setItemSpy).toHaveBeenCalled();
  });

  it('show falls back to true for unknown or pre-hydration visibility', () => {
    const { result } = renderHook(() => useDashboardLayout());

    expect(result.current.show('unknown_card' as never)).toBe(true);
  });
});