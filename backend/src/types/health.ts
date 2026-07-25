export interface ReadinessDependencies {
  database: boolean;
  storage: boolean;
}

export interface ReadinessResponse {
  status: 'ready' | 'unavailable';
  dependencies: ReadinessDependencies;
  timestamp: string;
}
