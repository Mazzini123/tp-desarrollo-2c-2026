import mongoose from "mongoose";

const controlSchema = new mongoose.Schema(
  { _id: { type: String }, version: { type: Number, default: 0 } },
  { collection: "controles", versionKey: false },
);

export const ControlModel = mongoose.model("Control", controlSchema);
