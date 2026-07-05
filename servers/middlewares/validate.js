const { ZodError } = require("zod");
const { sendError } = require("./apiResponse");

// Generic Zod-based validation middleware
// Schemas should be defined against an object: { body, query, params, headers }
function validate(schema) {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      });

      // Overwrite raw request properties with parsed/sanitized Zod data
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.params !== undefined) req.params = parsed.params;
      if (parsed.query !== undefined) req.query = parsed.query;

      // Freeze parsed container for req.validated to discourage reference replacing
      req.validated = Object.freeze(parsed);

      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return sendError(
          res,
          400,
          "Validation error",
          err.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
            code: e.code,
          }))
        );
      }
      return sendError(res, 400, "Invalid request");
    }
  };
}

// Optional helper: returns [validate(schema), controller]
function createRoute(schema, controller) {
  return [validate(schema), controller];
}

module.exports = { validate, createRoute };
