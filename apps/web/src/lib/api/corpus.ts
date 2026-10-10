"use client";

import { useQuery } from "@tanstack/react-query";
import { CorpusStats } from "@unmet/shared";
import { apiGet } from "./client";

export function useCorpusStats() {
  return useQuery({
    queryKey: ["corpus", "stats"],
    queryFn: () => apiGet("/api/v1/corpus/stats", CorpusStats),
    staleTime: 60_000,
  });
}
