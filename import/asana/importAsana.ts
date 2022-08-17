// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import * as fs from "fs";
// import minimist from "minimist"
// import { exit } from "process"
import { ArchiveUtils } from "../util/archive";
import { Block } from "../../webapp/src/blocks/block";
import {
  IPropertyOption,
  IPropertyTemplate,
  createBoard,
  PropertyType,
} from "../../webapp/src/blocks/board";
import { createBoardView } from "../../webapp/src/blocks/boardView";
import { createCard } from "../../webapp/src/blocks/card";
import { createTextBlock } from "../../webapp/src/blocks/textBlock";
import { Workspace } from "./asana";
import { Utils } from "./utils";
import { createCommentBlock } from "../../webapp/src/blocks/commentBlock";
import { IAsanaTask } from "./src/types";

// HACKHACK: To allow Utils.CreateGuid to work
(global.window as any) = {};

const optionColors = [
  // 'propColorDefault',
  "propColorGray",
  "propColorBrown",
  "propColorOrange",
  "propColorYellow",
  "propColorGreen",
  "propColorBlue",
  "propColorPurple",
  "propColorPink",
  "propColorRed",
];
let optionColorIndex = 0;

function main() {
  // Read input
  const inputData = fs.readFileSync("./asana.json", "utf-8");
  const input = JSON.parse(inputData) as IAsanaTask;

  // Convert
  const blocks = convert(input);

  // Save output
  // TODO: Stream output
  const outputData = ArchiveUtils.buildBlockArchive(blocks);
  fs.writeFileSync("archive.boardarchive", outputData);
}

function getProjects(input: IAsanaTask): Workspace[] {
  const projectMap = new Map<string, Workspace>();

  input.data.forEach((datum) => {
    datum.projects.forEach((project) => {
      if (!projectMap.get(project.gid)) {
        projectMap.set(project.gid, project);
      }
    });
  });

  return [...projectMap.values()];
}

function getSections(input: IAsanaTask, projectId: string): Workspace[] {
  const sectionMap = new Map<string, Workspace>();

  input.data.forEach((datum) => {
    const membership = datum.memberships.find(
      (o) => o.project.gid === projectId
    );
    if (membership) {
      if (!sectionMap.get(membership.section.gid)) {
        sectionMap.set(membership.section.gid, membership.section);
      }
    }
  });

  return [...sectionMap.values()];
}

function createCardProperty(
  name: string,
  type: PropertyType
): IPropertyTemplate {
  return {
    id: Utils.createGuid(),
    name: name,
    type: type,
    options: [],
  };
}

function convert(input: IAsanaTask): Block[] {
  const projects = getProjects(input);
  if (projects.length < 1) {
    console.error("No projects found");
    return [];
  }
  // TODO: Handle multiple projects
  const project = projects[0];
  const blocks: Block[] = [];

  // Board
  const board = createBoard();
  console.log(`Board: ${project.name}`);
  board.rootId = board.id;
  board.title = project.name;
  // Convert sections (columns) to a Select property
  const optionIdMap = new Map<string, string>();
  const options: IPropertyOption[] = [];
  const sections = getSections(input, project.gid);

  sections.forEach((section) => {
    const optionId = Utils.createGuid();
    optionIdMap.set(section.gid, optionId);
    const color = optionColors[optionColorIndex % optionColors.length];
    optionColorIndex += 1;
    const option: IPropertyOption = {
      id: optionId,
      value: section.name,
      color,
    };
    options.push(option);
  });

  const cardPropertyCreatedBy = createCardProperty("Created By", "text");
  const cardCreatedAt = createCardProperty("Created At", "date");
  const cardDueOn = createCardProperty("Due On", "date");
  const cardModifiedAt = createCardProperty("Modified At", "date");

  const cardPropertySection: IPropertyTemplate = {
    id: Utils.createGuid(),
    name: "Section",
    type: "select",
    options,
  };

  board.fields.cardProperties = [
    cardPropertySection,
    cardPropertyCreatedBy,
    cardCreatedAt,
    cardDueOn,
    cardModifiedAt,
  ];
  // board.fields.cardProperties =
  blocks.push(board);

  // Board view
  const view = createBoardView();
  view.title = "Board View";
  view.fields.viewType = "board";
  view.rootId = board.id;
  view.parentId = board.id;
  blocks.push(view);
  // Cards

  for (const card of input.data) {
    console.log(`Card: ${card.name}`);

    const outCard = createCard();
    outCard.title = card.name;
    outCard.rootId = board.id;
    outCard.parentId = board.id;

    // Map lists to Select property options
    const membership = card.memberships.find(
      (o) => o.project.gid === project.gid
    );
    if (membership) {
      const optionId = optionIdMap.get(membership.section.gid);

      outCard.fields.properties[cardDueOn.id] = `{"from":${Math.floor(
        new Date(card?.due_on).getTime()
      )}}`;
      outCard.fields.properties[cardPropertyCreatedBy.id] = card.assignee.name;
      outCard.fields.properties[cardCreatedAt.id] = `{"from":${Math.floor(
        new Date(card.created_at).getTime()
      )}}`;
      outCard.fields.properties[cardModifiedAt.id] = `{"from":${Math.floor(
        new Date(card.modified_at).getTime()
      )}}`;
      if (optionId) {
        outCard.fields.properties[cardPropertySection.id] = optionId;
      } else {
        console.warn(
          `Invalid idList: ${membership.section.gid} for card: ${card.name}`
        );
      }
    } else {
      console.warn(`Missing idList for card: ${card.name}`);
    }

    blocks.push(outCard);

    if (card.notes) {
      const text = createTextBlock();
      text.title = card.notes;
      text.rootId = board.id;
      text.parentId = outCard.id;
      blocks.push(text);

      outCard.fields.contentOrder = [text.id];
    }

    if (card.comments.length >= 1) {
      card.comments.forEach((comment) => {
        const commentblock = createCommentBlock();
        commentblock.title = comment.text;
        commentblock.rootId = board.id;
        commentblock.parentId = outCard.id;
        commentblock.createAt = Math.floor(new Date(card.created_at).getTime());
        commentblock.createdBy = comment.created_by.name;
        blocks.push(commentblock);
      });
    }
  }

  console.log("");
  console.log(`Found ${input.data.length} card(s).`);

  return blocks;
}

main();
