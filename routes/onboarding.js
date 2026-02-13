const generateLesson = require("../services/lessonGenerator");
const express = require("express");
const router = express.Router();
const pool = require("../db");

if (req.body.beta_key !== "BETA2026") {
  return res.status(403).json({ error: "Beta access only" });
}

router.post("/", async (req, res) => {
  try {
    const { name, phone_number, level, delivery_time } = req.body;

    // Basic validation
    if (!name || !phone_number || !level || !delivery_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user already exists
    const userResult = await pool.query(
      "SELECT * FROM users WHERE phone_number = $1",
      [phone_number]
    );

    let user;

    if (userResult.rows.length === 0) {
      const newUser = await pool.query(
        "INSERT INTO users (name, phone_number) VALUES ($1, $2) RETURNING *",
        [name, phone_number]
      );
      user = newUser.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // Get program
    const programResult = await pool.query(
      "SELECT * FROM programs WHERE name = $1",
      ["Mental Clarity Reset"]
    );

    if (programResult.rows.length === 0) {
      return res.status(400).json({ error: "Program not found" });
    }

    const program = programResult.rows[0];

    // Enroll user
    const userProgram = await pool.query(
      `INSERT INTO user_programs 
       (user_id, program_id, level, delivery_time, start_date) 
       VALUES ($1, $2, $3, $4, CURRENT_DATE + INTERVAL '1 day')
       RETURNING *`,
      [user.id, program.id, level, delivery_time]
    );
    // Generate Day 1 lesson
const lessonText = await generateLesson(level);

// Store lesson in database
await pool.query(
  `INSERT INTO generated_lessons
   (user_program_id, day_number, script, whatsapp_text)
   VALUES ($1, $2, $3, $4)`,
  [
    userProgram.rows[0].id,
    1,
    lessonText,
    lessonText
  ]
);

    res.json({
      success: true,
      message: "User enrolled successfully",
      user_program: userProgram.rows[0],
    });

  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
