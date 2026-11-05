import mongoose from "mongoose";

// Mirrors src/pages/RankTracker.tsx's `KeywordItem` interface. Holds only the
// *current* snapshot; day-by-day values live in RankHistory (see that model)
// so this document stays small and cheap to list/sort/filter.
const trackedKeywordSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

        keyword: { type: String, required: true, trim: true },
        url: { type: String, required: true },
        domain: { type: String, required: true }, // derived from url at creation time

        active: { type: Boolean, default: true },

        // "checking" while a rank-check job is in flight for this keyword,
        // "completed" | "failed" after — lets the UI show a spinner badge.
        status: {
            type: String,
            enum: ["pending", "checking", "completed", "failed"],
            default: "pending",
        },

        currentPosition: { type: Number, default: null }, // null = not found in top N
        currentPage: { type: Number, default: null },
        bestPosition: { type: Number, default: null },
        positionChange: { type: Number, default: 0 }, // computed by the rank worker, not the client

        lastChecked: { type: Date, default: null },

        competitors: [
            {
                position: Number,
                url: String,
                domain: String,
                title: String,
                snippet: String,
                _id: false,
            },
        ],
    },
    { timestamps: true }
);

trackedKeywordSchema.set("toJSON", {
    transform: (_doc, ret) => {
        ret._id = ret._id.toString();
        delete ret.__v;
        delete ret.user;
        return ret;
    },
});

export const TrackedKeyword = mongoose.model("TrackedKeyword", trackedKeywordSchema);
