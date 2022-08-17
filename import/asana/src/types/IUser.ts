import { IWorkspaces } from "./IWorkspaces";
export interface IUser {
  gid: string;
  email: string;
  name: string;
  phone: string | null;
  resource_type: string;
  workspaces: IWorkspaces[];
}
