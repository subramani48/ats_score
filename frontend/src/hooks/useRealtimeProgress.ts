'use client';

import { useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAnalysisStore } from '@/stores/analysisStore';
import type { Analysis } from '@/lib/api';

export const useRealtimeProgress = (onComplete?: (result: Analysis) => void, onError?: (msg: string) => void) => {
  const { currentJobId, setProgress, setResult } = useAnalysisStore();

  const connect = useCallback(
    (jobId: string) => {
      const es = new EventSource(api.streamUrl(jobId));

      es.addEventListener('progress', (e) => {
        try {
          setProgress(JSON.parse(e.data));
        } catch {/* ignore */}
      });

      es.addEventListener('completed', (e) => {
        try {
          const result = JSON.parse(e.data) as Analysis;
          setResult(result);
          onComplete?.(result);
        } catch {/* ignore */}
        es.close();
      });

      es.addEventListener('error', (e: Event) => {
        const msg = (e as MessageEvent).data
          ? JSON.parse((e as MessageEvent).data).message
          : 'Processing failed';
        onError?.(msg);
        es.close();
      });

      es.onerror = () => {
        // SSE connection dropped — don't call onError, just close
        es.close();
      };

      return () => es.close();
    },
    [setProgress, setResult, onComplete, onError],
  );

  useEffect(() => {
    if (!currentJobId) return;
    const cleanup = connect(currentJobId);
    return cleanup;
  }, [currentJobId, connect]);

  return { connect };
};
