import { IJsonModel } from "flexlayout-react";

const model: IJsonModel = {
  global: {},
  borders: [
    { type: "border", location: "left", children: [] },
    { type: "border", location: "right", children: [] },
    { type: "border", location: "bottom", children: [] },
    { type: "border", location: "top", children: [] }
  ],
  layout: {
    type: "row",
    id: "root",
    children: []
  }
};
