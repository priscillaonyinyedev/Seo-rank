import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },

        // Drives the "Scans Left Today" widget on the Dashboard and the
        // Free (5/day) vs Pro (unlimited) gate on POST /analyze.
        plan: { type: String, enum: ["free", "pro"], default: "free" },

        // Reset daily by the quota check (see middleware/quota.js) rather than
        // by a cron job — cheaper, and self-heals even if a day gets skipped.
        analysisCount: { type: Number, default: 0 },
        analysisCountResetAt: { type: Date, default: () => startOfUTCDay() },
    },
    { timestamps: true }
);

function startOfUTCDay(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

userSchema.methods.toPublicJSON = function () {
    return {
        _id: this._id,
        name: this.name,
        email: this.email,
        plan: this.plan,
        analysisCount: this.analysisCount,
    };
};

export const User = mongoose.model("User", userSchema);
