const express = require("express");
const cors = require("cors");
require("dotenv").config();
const startScheduler = require("./services/scheduler");

console.log("DATABASE_URL =", process.env.DATABASE_URL);

const pool = require("./db");
const onboardingRoutes = require("./routes/onboarding");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/onboarding", onboardingRoutes);

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.send(`Database connected ✅ Server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error("DB ERROR:", err);
    res.status(500).send(err.message);
  }
});

setTimeout(() => {
  startScheduler();
}, 5000);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const generateLesson = require("./services/lessonGenerator");

app.get("/test-ai", async (req, res) => {
  try {
    const lesson = await generateLesson("overwhelmed");
    res.send(lesson);
  } catch (err) {
    console.error("AI TEST ERROR:", err);
    res.status(500).send(err.message);
  }
});

