import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(user) {
    return jwt.sign({ sub: user._id.toString() }, env.jwtSecret, {
        expiresIn: env.jwtExpiresIn,
    });
}

export function verifyToken(token) {
    // Throws if invalid/expired — caller (middleware) is responsible for
    // catching and turning that into a 401. Keeping this function throw-y
    // (rather than returning null) means we never accidentally treat a
    // malformed token as "no token".
    return jwt.verify(token, env.jwtSecret);
}
