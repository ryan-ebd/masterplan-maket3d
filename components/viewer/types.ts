export interface LayerMeta {
  id: string;
  label: string;
  nodeName: string;
  defaultVisible: boolean;
}

export interface InfoBangunan {
  heightM: number;
  heightSource: string;
  osmId?: string | number;
}
