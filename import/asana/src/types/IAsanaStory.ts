export interface IAsanaStory {
  gid: string;
  resource_type: string;
  resource_subtype: string;
  created_at: Date;
  created_by: ICreatedBy;
  liked: boolean;
  likes: any;
  num_likes: number;
  text: string;
  html_text: string;
  target: IStoryTarget;
  is_pinned: boolean;
  is_edited: boolean;
  source: any;
}

interface ICreatedBy {
  gid: string;
  name: string;
}

interface IStoryTarget {
  gid: string;
  resource_type: string;
}
