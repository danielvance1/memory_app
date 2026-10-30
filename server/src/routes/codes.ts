import { Router } from "express";
import { DatabaseError } from "pg";
import { pool } from "../db";
import { requireAuth } from "../auth/middleware";

export const MAX_TEXT_LENGTH = 200;

// Every query here is scoped to req.user.id, so people only ever see and change
// their own codes. There is deliberately no DELETE route: rows are never removed.
export function codesRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  // GET /api/codes   -> { codes: [{ code, text }] }
  // Everything the user has, in one request. Rows with blank text are included;
  // the screen treats blank as "not set".
  router.get("/", async (req, res) => {
    const { rows } = await pool.query<{ code: string; text: string }>(
      "SELECT code, text FROM codes WHERE user_id = $1 ORDER BY length(code), code",
      [req.user!.id],
    );
    res.json({ codes: rows });
  });

  // PUT /api/codes/:code  { text }   -> { code: { code, text } }
  // "Make this code's text exactly this." Non-blank text creates or updates the
  // row. Blank text blanks an existing row but never creates one.
  router.put("/:code", async (req, res) => {
    const userId = req.user!.id;
    const code = req.params.code;

    if (typeof code !== "string" || !/^[0-9]{1,3}$/.test(code)) {
      res.status(400).json({ field: "code", error: "A code is 1 to 3 digits." });
      return;
    }
    // Codes above the user's current system (a 3 digit code on the 1 digit system) can't be set.
    if (code.length > req.user!.codeSystem) {
      res.status(400).json({
        field: "code",
        error: `Code ${code} isn't part of your ${req.user!.codeSystem} digit system.`,
      });
      return;
    }

    const rawText: unknown = req.body?.text;
    if (typeof rawText !== "string") {
      res.status(400).json({ field: "text", error: "Text is required." });
      return;
    }
    const text = rawText.trim(); // no leading or trailing whitespace is ever stored
    if (text.length > MAX_TEXT_LENGTH) {
      res.status(400).json({ field: "text", error: `Text can be at most ${MAX_TEXT_LENGTH} characters.` });
      return;
    }

    try {
      if (text === "") {
        // Clearing: keep the row (if there is one), just blank it. Nothing to create otherwise.
        await pool.query("UPDATE codes SET text = '' WHERE user_id = $1 AND code = $2", [userId, code]);
        res.json({ code: { code, text: "" } });
        return;
      }

      const { rows } = await pool.query<{ code: string; text: string }>(
        `INSERT INTO codes (user_id, code, text) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, code) DO UPDATE SET text = EXCLUDED.text
         RETURNING code, text`,
        [userId, code, text],
      );
      res.json({ code: rows[0] });
    } catch (err) {
      // 23505 = "unique violation". The database's unique index is the real guard,
      // so this is correct even if two requests race.
      if (err instanceof DatabaseError && err.code === "23505" && err.constraint === "codes_user_text_key") {
        const other = await pool.query<{ code: string }>(
          "SELECT code FROM codes WHERE user_id = $1 AND lower(text) = lower($2) AND code <> $3",
          [userId, text, code],
        );
        const which = other.rows[0]?.code;
        res.status(409).json({
          field: "text",
          error: which ? `Code ${which} already uses that text.` : "Another code already uses that text.",
        });
        return;
      }
      // 23514 = "check violation": text the database considers untrimmed even though JavaScript's trim() kept it.
      if (err instanceof DatabaseError && err.code === "23514") {
        const tooLong = err.constraint === "codes_text_length";
        res.status(400).json({
          field: "text",
          error: tooLong ? `Text can be at most ${MAX_TEXT_LENGTH} characters.` : "Text can't start or end with whitespace.",
        });
        return;
      }
      throw err; // anything else becomes a generic 500 (see app.ts)
    }
  });

  return router;
}
