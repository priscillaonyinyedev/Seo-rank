// A tiny typed error we can throw from anywhere (controllers, services) and
// catch once in the global error handler (see middleware/errorHandler.js).
// Keeps controllers free of repeated res.status(...).json(...) boilerplate
// for the error paths.
export class ApiError extends Error {
    constructor(statusCode, message, details = undefined) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}
