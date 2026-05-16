import mongoose from "mongoose";

const nbuHistorySchema = new mongoose.Schema(
  {
    version: { type: String, default: "" },
    determination: { type: String, default: "" },
    ub: { type: String, default: "" },
    urgency: { type: String, default: "" },
    reference: { type: String, default: "" },
    frequency: { type: String, default: "" },
    section: { type: String, default: "" },
    isCurrent: { type: Boolean, default: false },
  },
  { _id: false }
);

const nbuChangeSchema = new mongoose.Schema(
  {
    comparedVersion: { type: String, default: "" },
    field: { type: String, default: "" },
    previousValue: { type: String, default: "" },
    currentValue: { type: String, default: "" },
    changeType: { type: String, default: "" },
  },
  { _id: false }
);

const nbuEntrySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    searchBlob: { type: String, default: "", index: true },
    current: {
      determination: { type: String, default: "" },
      ub: { type: String, default: "" },
      urgency: { type: String, default: "" },
      reference: { type: String, default: "" },
      frequency: { type: String, default: "" },
      source: { type: String, default: "" },
    },
    latestUpdate: { type: String, default: "" },
    metadata: {
      synonyms: { type: String, default: "" },
      abbreviations: { type: String, default: "" },
      interpretationRules: { type: String, default: "" },
      deprecatedPractices: { type: String, default: "" },
      observations: { type: String, default: "" },
      covidUpdate: { type: String, default: "" },
      covidDetail: { type: String, default: "" },
      auxiliaryDetermination: { type: String, default: "" },
      finalUb: { type: String, default: "" },
    },
    history: [nbuHistorySchema],
    changes: [nbuChangeSchema],
  },
  { timestamps: true }
);

nbuEntrySchema.index({
  code: "text",
  "current.determination": "text",
  "metadata.abbreviations": "text",
  "metadata.synonyms": "text",
});

export const NbuEntry = mongoose.model("NbuEntry", nbuEntrySchema);
