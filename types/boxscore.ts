export interface BoxScore {
  player_id: string;
  game_id: string;
  team_id: string;
  season: string;
  player: string;
  team: string;
  match_up: string;
  game_date: string;
  w_l: string;
  min: number | null;
  pts: number | null;
  fgm: number | null;
  fga: number | null;
  fg_percent: number | null;
  three_pm: number | null;
  three_pa: number | null;
  three_p_percent: number | null;
  ftm: number | null;
  fta: number | null;
  ft_percent: number | null;
  oreb: number | null;
  dreb: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  pf: number | null;
  plus_minus: number | null;
  fp: number | null;
}

export interface FilterParams {
  pts?: number;
  reb?: number;
  ast?: number;
  stl?: number;
  blk?: number;
  fgm?: number;
  fga?: number;
  fg_percent?: number;
  three_pm?: number;
  three_pa?: number;
  three_p_percent?: number;
  ftm?: number;
  fta?: number;
  ft_percent?: number;
  oreb?: number;
  dreb?: number;
  tov?: number;
  pf?: number;
  plus_minus?: number;
  fp?: number;
  min?: number;
  season?: string;
  player?: string;
  team?: string;
  player_id?: string;
  game_id?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse {
  data: BoxScore[];
  total: number;
  limit: number;
  offset: number;
}
