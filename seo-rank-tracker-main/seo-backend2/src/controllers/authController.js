import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";

// Matches exactly the fields Login.tsx collects: name (register only),
// email, password.
const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

const loginSchema = z.object({
    email: z.string().trim().email("Enter a valid email"),
    password: z.string().min(1, "Password is required"),
});

export async function register(req, res, next) {
    try {
        const { name, email, password } = registerSchema.parse(req.body);

        const existing = await User.findOne({ email });
        if (existing) {
            throw new ApiError(409, "An account with that email already exists");
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.create({ name, email, passwordHash });

        const token = signToken(user);
        res.status(201).json({ token, user: user.toPublicJSON() });
    } catch (err) {
        next(err);
    }
}

export async function login(req, res, next) {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await User.findOne({ email });
        // Same error message whether the email doesn't exist or the password
        // is wrong — don't leak which one it was.
        if (!user) throw new ApiError(401, "Invalid email or password");

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) throw new ApiError(401, "Invalid email or password");

        const token = signToken(user);
        res.json({ token, user: user.toPublicJSON() });
    } catch (err) {
        next(err);
    }
}

export async function me(req, res) {
    // req.user is attached by requireAuth middleware
    res.json({ user: req.user.toPublicJSON() });
}
