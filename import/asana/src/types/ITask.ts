import { Datum } from "../../asana";
import { IAsanaStory } from "./IAsanaStory";
import { IAttachment } from "./IAttachment";

export interface ITask extends Datum {
  comments: IAsanaStory[];
  attachments: IAttachment[];
}

export interface IAsanaTask {
  data: ITask[];
}
