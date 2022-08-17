import { fetch, FetchMethods, RequestOptions } from "@sapphire/fetch";
import { writeFileSync } from "fs";
import { Datum } from "../asana";
import { accessToken } from "./../config.json";
import {
  IAsanaTask,
  ITask,
  IUser,
  IWorkspaces,
  IAsanaStory,
  IAttachment,
} from "./types";
const prompt = require("prompt-sync")();
const API_ENDPOINT = "https://app.asana.com/api/1.0/";

export class AsanaAPI {
  workspaces: IWorkspaces[];

  constructor() {
    this.workspaces = [];
  }

  async init() {
    await this.getMe();
    if (this.workspaces.length >= 1) {
      this.workspaces.forEach((workpace, index) => {
        console.log(`${index + 1}. Workspace: ${workpace.name}`);
      });
    } else {
      return console.log(`No Workspaces found for this user!`);
    }
    console.log(`\n`);
    const getNumberOfWorkspaces = prompt(
      `Please choose a workspace to export to mattermost: `
    );
    if (Number(getNumberOfWorkspaces)) {
      return Number(getNumberOfWorkspaces);
    } else {
      return console.log(
        `Your input is invalid, please make sure to input the number of the workspace`
      );
    }
  }
  async request<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      ...options,
    });
  }

  async getMe(): Promise<IUser> {
    const endpoint = API_ENDPOINT + "users/me";
    const user: any = await this.request(endpoint, {
      method: FetchMethods.Get,
    });
    if (!user.data.workspaces)
      throw new Error("No Workspaces found for this user.");
    this.workspaces = user.data.workspaces;
    return user.data as IUser;
  }

  async getTasks(workspace: string, assignee: string): Promise<Datum[]> {
    const endpoint =
      API_ENDPOINT +
      `tasks?opt_fields=gid,resource_type,assignee,assignee.name,resource_subtype,created_at,memberships.project,memberships.section,memberships.project.name,memberships.section.name,assignee_status,completed,completed_at,dependencies,custom_fields,dependents,due_on,due_at,external,followers,liked,is_rendered_as_separator,likes,memberships,modified_at,name,notes,html_notes,num_likes,num_subtasks,parent,projects.name,workspace,start_on,tags&limit=10&workspace=${workspace}&assignee=${assignee}`;
    const req: any = await this.request(endpoint, {
      method: FetchMethods.Get,
    });

    return req.data as Datum[];
  }

  async getUser(userGid: string) {
    const endpoint = API_ENDPOINT + `users/${userGid}?opt_fields=name`;
    const req: any = await this.request(endpoint, {
      method: FetchMethods.Get,
    });

    return req.data as IUser;
  }

  async getTasksWithComments(workspaceNumber: number): Promise<IAsanaTask> {
    const users = await this.getUsers(this.workspaces[workspaceNumber].gid);

    const Alltasks: ITask[] = [];

    for (const user of users) {
      // Get all tasks of each user
      const tasks = await this.getTasks(
        this.workspaces[workspaceNumber].gid,
        user.gid
      );
      if (tasks.length >= 1) {
        for (const task of tasks) {
          // Get all Stories associated with this task id and filter the comments
          const getTaskStories = await (
            await this.getTaskStories(task.gid)
          ).filter((task) => task.resource_subtype === "comment_added");

          const comments: IAsanaStory[] = [];

          for (const taskcomment of getTaskStories) {
            if (taskcomment.resource_subtype === "comment_added") {
              // Check if the html body contains user gid
              const checkComment = this.checkHTMLBodyForGid(
                taskcomment.html_text
              );

              if (checkComment) {
                const getUser = await this.getUser(checkComment);

                const getLinkFromText =
                  /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/.exec(
                    taskcomment.text
                  );

                if (!getLinkFromText) continue;

                taskcomment.text = taskcomment.text.replace(
                  getLinkFromText[0],
                  `@${getUser.name}`
                );
              }
              comments.push(taskcomment);
            }
          }

          // Get attachments associated with this task
          const getTaskAttachments = await this.getTaskAttachments(task.gid);
          // Add comments to each task
          const finalTask: ITask = {
            ...task,
            comments: comments,
            attachments: getTaskAttachments,
          };

          Alltasks.push(finalTask);
        }
      }
    }
    return { data: Alltasks } as IAsanaTask;
  }

  async getUsers(workspace: string): Promise<IUser[]> {
    const endpoint =
      API_ENDPOINT +
      `users?opt_fields=gid,resource_type,name,email,photo,workspaces&limit=10&workspace=${workspace}`;

    const req: any = await this.request(endpoint, {
      method: FetchMethods.Get,
    });

    return req.data as IUser[];
  }

  async getTaskStories(taskGid: string): Promise<IAsanaStory[]> {
    const endpoint =
      API_ENDPOINT +
      `tasks/${taskGid}/stories?opt_fields=gid,resource_type,created_at,resource_subtype,created_by,created_by.name,liked,likes,num_likes,text,html_text,target,is_pinned,is_edited,source`;

    const req: any = await this.request(endpoint, {
      method: FetchMethods.Get,
    });

    return req.data as IAsanaStory[];
  }

  async getTaskAttachments(taskGid: string): Promise<IAttachment[]> {
    const endpoint =
      API_ENDPOINT +
      `attachments?opt_fields=gid,resource_type,created_at,download_url,host,name,parent,view_url&limit=10&parent=${taskGid}`;

    const req: any = await this.request(endpoint, {
      method: FetchMethods.Get,
    });
    return req.data as IAttachment[];
  }

  async exportTasksAsJSON(): Promise<void> {
    const getWorkspace = await this.init();
    if (getWorkspace) {
      const getAllTasks = await this.getTasksWithComments(getWorkspace - 1);
      writeFileSync("asana.json", JSON.stringify(getAllTasks));
      console.log(`Exported Workspace Number ${getWorkspace}`);
    } else {
      throw new Error(`Could not retrieve Workspace data!`);
    }
  }

  checkHTMLBodyForGid(text: string) {
    if (text.includes("data-asana-gid")) {
      const gid = text
        .split(" ")
        .filter((string) => string.startsWith("data-asana-gid"))
        .join("");
      return gid.slice(16, 32).replace('"', "");
    }
    return;
  }
}

(async () => {
  await new AsanaAPI().exportTasksAsJSON();
})();
