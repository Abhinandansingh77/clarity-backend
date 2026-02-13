const cron = require("node-cron");
const pool = require("../db");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

const sendWhatsAppMessage = require("./whatsappService");
const generateLesson = require("./lessonGenerator");

dayjs.extend(utc);
dayjs.extend(timezone);

function startScheduler() {
  console.log("Scheduler started...");

  // Run every minute
  cron.schedule("* * * * *", async () => {
    try {
      const now = dayjs().tz("Asia/Kolkata");
      const currentTime = now.format("HH:mm");

      console.log("Checking deliveries at", currentTime);

      // Get all active programs that haven't delivered today
      const result = await pool.query(`
        SELECT *
        FROM user_programs
        WHERE status = 'active'
          AND (last_delivered_at IS NULL 
               OR DATE(last_delivered_at) < CURRENT_DATE)
      `);

      if (result.rows.length === 0) {
        console.log("No active users");
        return;
      }

      for (const userProgram of result.rows) {
        const deliveryTime = dayjs(
          userProgram.delivery_time,
          "HH:mm"
        );

        const diffMinutes = Math.abs(
          now.diff(deliveryTime, "minute")
        );

        // Allow 5-minute window
        if (diffMinutes > 5) continue;

        console.log(
          "Sending lesson to user:",
          userProgram.user_id,
          "Day:",
          userProgram.current_day
        );

        // Get or generate lesson
        const lessonResult = await pool.query(
          `SELECT * FROM generated_lessons
           WHERE user_program_id = $1
           AND day_number = $2`,
          [userProgram.id, userProgram.current_day]
        );

        let lesson;

        if (lessonResult.rows.length === 0) {
          console.log(
            "Generating lesson for Day",
            userProgram.current_day
          );

          const lessonText = await generateLesson(
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
              lessonText,
              lessonText
            ]
          );

          lesson = inserted.rows[0];
        } else {
          lesson = lessonResult.rows[0];
        }

        // Fetch user
        const userResult = await pool.query(
          "SELECT * FROM users WHERE id = $1",
          [userProgram.user_id]
        );

        const user = userResult.rows[0];

        // Send WhatsApp message
        await sendWhatsAppMessage(
          user.phone_number,
          lesson.whatsapp_text
        );

        console.log(
          "Delivered Day",
          userProgram.current_day,
          "to",
          user.phone_number
        );

        // Mark delivered
        await pool.query(
          `UPDATE user_programs
           SET last_delivered_at = NOW(),
               current_day = current_day + 1
           WHERE id = $1`,
          [userProgram.id]
        );

        // Deliver only one per minute (safety)
        break;
      }
    } catch (err) {
      console.error("Scheduler error:", err);
    }
  });
}

module.exports = startScheduler;
