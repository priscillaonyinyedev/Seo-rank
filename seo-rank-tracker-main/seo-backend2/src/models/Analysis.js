import mongoose from "mongoose";

// Field names mirror src/pages/Report.tsx's `AnalysisData` interface 1:1 —
// resist the urge to "clean up" naming here, since every mismatch is a
// front-end bug. If a field needs to change, change the front end and
// backend together.
const analysisSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        url: { type: String, required: true },

        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },
        error: { type: String, default: null },

        overallScore: { type: Number, default: null },
        loadTime: { type: Number, default: null }, // ms
        pageSize: { type: Number, default: null }, // bytes
        wordCount: { type: Number, default: null },

        categories: {
            seo: { type: Number, default: null },
            performance: { type: Number, default: null },
            accessibility: { type: Number, default: null },
            bestPractices: { type: Number, default: null },
        },

        metaData: {
            title: String,
            description: String,
            canonical: String,
            robots: String,
            ogTitle: String,
            ogDescription: String,
            ogImage: String,
            twitterCard: String,
            viewport: String,
            charset: String,
        },

        headings: {
            h1: { type: Number, default: 0 },
            h2: { type: Number, default: 0 },
            h3: { type: Number, default: 0 },
            h4: { type: Number, default: 0 },
            h5: { type: Number, default: 0 },
            h6: { type: Number, default: 0 },
            h1Texts: { type: [String], default: [] },
        },

        links: {
            internal: { type: Number, default: 0 },
            external: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        },

        images: {
            total: { type: Number, default: 0 },
            missingAlt: { type: Number, default: 0 },
            withAlt: { type: Number, default: 0 },
        },

        keywords: [
            {
                word: String,
                count: Number,
                density: Number,
                _id: false,
            },
        ],

        // Written by the Gemini stage of the audit worker — the one part of
        // this document that's AI-generated rather than scraped/computed.
        issues: [
            {
                severity: { type: String, enum: ["critical", "warning", "info"] },
                category: String,
                message: String,
                recommendation: String,
                _id: false,
            },
        ],
    },
    { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// toJSON transform gives the front end `_id` as a string and drops __v,
// matching what dummyWebsiteAnalysis in assets.tsx already looks like.
analysisSchema.set("toJSON", {
    transform: (_doc, ret) => {
        ret._id = ret._id.toString();
        delete ret.__v;
        delete ret.user;
        return ret;
    },
});

export const Analysis = mongoose.model("Analysis", analysisSchema);
