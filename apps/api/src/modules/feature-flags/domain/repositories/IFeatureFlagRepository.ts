import type { FeatureFlag } from "../entities/FeatureFlag.js";

export interface FeatureFlagPagination {
  page: number;
  pageSize: number;
}

export interface FeatureFlagPage {
  items: FeatureFlag[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IFeatureFlagRepository {
  findById(id: string): Promise<FeatureFlag | null>;
  findByChave(chave: string): Promise<FeatureFlag | null>;
  findAll(): Promise<FeatureFlag[]>;
  findMany(pagination: FeatureFlagPagination): Promise<FeatureFlagPage>;
  save(flag: FeatureFlag): Promise<void>;
}
