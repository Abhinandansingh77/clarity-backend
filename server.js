const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");
const onboardingRoutes = require("./routes/onboarding");
const generateLesson = require("./services/lessonGenerator");

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- ROUTES -------------------- */
app.use("/api/onboarding", onboardingRoutes);

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.send(`Database connected ✅ Server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error("DB ERROR:", err);
    res.status(500).send("Database connection failed");
  }
});

app.get("/test-ai", async (req, res) => {
  try {
    const lesson = await generateLesson("overwhelmed");
    res.send(lesson);
  } catch (err) {
    console.error("AI TEST ERROR:", err);
    res.status(500).send("AI generation failed");
  }
});

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

setTimeout(() => {
  startScheduler();
}, 5000);

/*
⚠️ Scheduler intentionally disabled.
We will enable it AFTER Webflow onboarding is stable.
*/
