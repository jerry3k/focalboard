export interface IAttachment {
  gid: string;
  created_at: Date;
  download_url: string;
  host: string;
  name: string;
  parent: { gid: string; resource_type: string };
  resource_type: string;
  view_url: string;
}
