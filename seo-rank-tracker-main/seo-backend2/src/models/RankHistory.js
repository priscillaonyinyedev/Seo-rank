import mongoose from "mongoose";

// One row per rank-check (daily, via the scheduler — see workers/scheduler.js).
// Append-only by design: RankDetail.tsx draws its trend chart from this list
// and explicitly handles `position: null` as "checked but not found" rather
// than "not checked" — so a failed/negative check still gets a row, never a
// skipped day. Never overwrite a row; always insert a new one.
const rankHistorySchema = new mongoose.Schema(
    {
        trackedKeyword: { type: mongoose.Schema.Types.ObjectId, ref: "TrackedKeyword", required: true, index: true },
        date: { type: Date, default: Date.now, index: true },
        position: { type: Number, default: null },
    },
    { timestamps: false }
);

rankHistorySchema.set("toJSON", {
    transform: (_doc, ret) => {
        ret._id = ret._id.toString();
        delete ret.__v;
        delete ret.trackedKeyword;
        return ret;
    },
});

export const RankHistory = mongoose.model("RankHistory", rankHistorySchema);
