"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleSchema = exports.RoleInfo = exports.Role = void 0;
var mongoose_1 = require("mongoose");
var zod_1 = require("zod");
exports.Role = zod_1.z.enum(["USER", "ADMIN", "CORPORATE"]);
exports.RoleInfo = zod_1.z.object({
    email: zod_1.z.coerce.string().email(),
    roles: zod_1.z.array(exports.Role),
});
exports.RoleSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    roles: {
        type: [String],
        enum: exports.Role.Values,
        default: [],
        required: true,
    },
});
