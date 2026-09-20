'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalysisStore } from '@/stores/analysisStore';
import ApiKeysManager from '@/components/dashboard/ApiKeysManager';

export default function ApiKeysPage() {
  const { token } = useAnalysisStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  return (
    <div className="max-w-3xl mx-auto">
      <ApiKeysManager />
    </div>
  );
}
