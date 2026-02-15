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

      // Get all active users who haven't received today's lesson
      const result = await pool.query(`
        SELECT *
        FROM user_programs
        WHERE status = 'active'
          AND (last_delivered_at IS NULL
               OR DATE(last_delivered_at) < CURRENT_DATE)
      `);

      if (result.rows.length === 0) {
        console.log("No users scheduled right now");
        return;
      }

      for (const userProgram of result.rows) {
        // Calculate course day based on start_date
        const startDate = dayjs(userProgram.start_date).tz("Asia/Kolkata");
        const courseDay = now.diff(startDate, "day") + 1;

        if (courseDay <= 0) continue;

        // Check delivery time window (±5 minutes)
        const deliveryTime = dayjs(
          userProgram.delivery_time,
          "HH:mm"
        );

        const diffMinutes = Math.abs(
          now.diff(deliveryTime, "minute")
        );

        if (diffMinutes > 5) continue;

        console.log(
          "Sending lesson to user:",
          userProgram.user_id,
          "Day:",
          courseDay
        );

        // Fetch or generate lesson
        const lessonResult = await pool.query(
          `SELECT * FROM generated_lessons
           WHERE user_program_id = $1
           AND day_number = $2`,
          [userProgram.id, courseDay]
        );

        let lesson;

        if (lessonResult.rows.length === 0) {
          console.log("Generating lesson for Day", courseDay);

          const lessonText = await generateLesson(
            userProgram.level,
            courseDay
          );

          const inserted = await pool.query(
            `INSERT INTO generated_lessons
             (user_program_id, day_number, script, whatsapp_text)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
              userProgram.id,
              courseDay,
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
          courseDay,
          "to",
          user.phone_number
        );

        // Mark delivery (DO NOT increment day)
        await pool.query(
          `UPDATE user_programs
           SET last_delivered_at = NOW()
           WHERE id = $1`,
          [userProgram.id]
        );

        // Safety: send only one lesson per minute
        break;
      }
    } catch (err) {
      console.error("Scheduler error:", err);
    }
  });
}

module.exports = startScheduler;
