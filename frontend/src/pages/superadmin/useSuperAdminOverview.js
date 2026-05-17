import { useCallback, useEffect, useMemo, useState } from 'react';
import { saGetMetricas, saGetSaloes } from '../../services/api';
import { buildSuperAdminInsights } from './superAdminData';

function normalizeMetricas(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  return payload;
}

function normalizeSaloes(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.saloes)) return payload.saloes;
  return [];
}

export function useSuperAdminOverview() {
  const [metricas, setMetricas] = useState(null);
  const [saloes, setSaloes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [metricasRes, saloesRes] = await Promise.all([saGetMetricas(), saGetSaloes()]);
      setMetricas(normalizeMetricas(metricasRes.data));
      setSaloes(normalizeSaloes(saloesRes.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Nao foi possivel carregar os dados do super admin.');
      setMetricas(null);
      setSaloes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const insights = useMemo(() => buildSuperAdminInsights(saloes, metricas), [metricas, saloes]);

  return {
    metricas,
    saloes,
    loading,
    error,
    reload,
    insights,
  };
}
