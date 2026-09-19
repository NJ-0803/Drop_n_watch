'use client';

import { RotateCcw } from 'lucide-react';
import type { Kind } from '@/lib/saved';
import type { SearchState } from '@/lib/useSearch';
import { PressButton } from './PressButton';
import { LoadingState, Results } from './Results';

/** Loading, results or error for a search; nothing when idle. */
export function SearchStatus({ state, kind, stores, onRetry }: { state: SearchState; kind: Kind; stores: string[]; onRetry: () => void }) {
  if (state.status === 'loading') return <LoadingState stores={stores} size={state.size} />;
  if (state.status === 'done') return <Results result={state.result} kind={kind} />;
  if (state.status === 'error')
    return (
      <div role="alert" className="mt-8 rounded-card bg-bad-dim p-5 text-bad">
        <p className="font-medium">{state.error}</p>
        <PressButton tone="quiet" className="mt-3" onClick={onRetry}>
          <RotateCcw size={16} /> Try again
        </PressButton>
      </div>
    );
  return null;
}
