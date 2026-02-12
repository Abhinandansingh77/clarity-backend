const cron = require("node-cron");
const pool = require("../db");

const sendWhatsAppMessage = require("./whatsappService");

function startScheduler() {
  console.log("Scheduler started...");

  // runs every minute
  cron.schedule("* * * * *", async () => {
    try {
      console.log("Checking deliveries...");

      const timeResult = await pool.query(
  `SELECT to_char(NOW(), 'HH24:MI') as time`
);

const currentTime = timeResult.rows[0].time;
      

      const result = await pool.query(
  `
  SELECT *
  FROM user_programs
  WHERE status = 'active'
  AND delivery_time >= NOW()::time - interval '1 minute'
  AND delivery_time <= NOW()::time
  AND (last_delivered_at IS NULL 
       OR DATE(last_delivered_at) < CURRENT_DATE)
  `
);

      if (result.rows.length === 0) {
        console.log("No users scheduled right now");
        return;
      }

      for (const userProgram of result.rows) {
        console.log("Sending lesson to user:", userProgram.user_id);

        const lesson = await pool.query(
          `SELECT * FROM generated_lessons
           WHERE user_program_id = $1
           AND day_number = $2`,
          [userProgram.id, userProgram.current_day]
        );

        let lessonData;

if (lesson.rows.length === 0) {
  console.log("Generating missing lesson for Day", userProgram.current_day);

  const generateLesson = require("./lessonGenerator");
  const newLessonText = await generateLesson(
  userProgram.level,
  userProgram.current_day
);

  const inserted = await pool.query(
    `INSERT INTO generated_lessons
     (user_program_id, day_number, script, whatsapp_text)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      userProgram.id,
      userProgram.current_day,
      newLessonText,
      newLessonText
    ]
  );

  lessonData = inserted.rows[0];
} else {
  lessonData = lesson.rows[0];
}

        console.log(
  "Lesson ready:",
  lessonData.script.substring(0, 60),
  "..."
);

        // simulate delivery
        const userResult = await pool.query(
  "SELECT * FROM users WHERE id = $1",
  [userProgram.user_id]
);

const user = userResult.rows[0];

await sendWhatsAppMessage(
  user.phone_number,
  lessonData.whatsapp_text
);

console.log("Delivered Day", userProgram.current_day);

        // move to next day
        await pool.query(
  `UPDATE user_programs
   SET last_delivered_at = NOW()
   WHERE id = $1`,
  [userProgram.id]
);

break;

      }

    } catch (err) {
      console.error("Scheduler error:", err.message);
    }
  });
}

module.exports = startScheduler;