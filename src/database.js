"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Database = void 0;
var mongoose_1 = require("mongoose");
var auth_schema_1 = require("./services/auth/auth-schema");
function initializeModel(modelName, schema, object) {
    schema.pre("validate", function (next) {
        var data = this.toObject();
        try {
            // Validate the data against the Zod schema
            object.parse(data);
            next();
        }
        catch (error) {
            next(new Error(error));
        }
    });
    return mongoose_1.default.model(modelName, schema);
}
// Example usage
exports.Database = {
    ROLES: initializeModel("role", auth_schema_1.RoleSchema, auth_schema_1.RoleInfo),
};
