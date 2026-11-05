import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
    mongoose.set("strictQuery", true);

    try {
        await mongoose.connect(env.mongoUri);
        console.log(`[db] Connected to MongoDB (${mongoose.connection.name})`);
    } catch (err) {
        console.error("[db] Failed to connect to MongoDB:", err.message);
        process.exit(1);
    }

    mongoose.connection.on("disconnected", () => {
        console.warn("[db] MongoDB disconnected");
    });
}
