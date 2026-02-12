const axios = require("axios");

async function generateLesson(level, dayNumber) {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `
You are a calm strategic mentor.

Generate Day ${dayNumber} lesson for a 30-day Mental Clarity program.

Each day must build progressively.
Do not repeat previous lessons.
Focus only on one core idea.

Structure:
1 Context
2 Core Insight
3 Action Step
4 Closing line

Rules:
- clear
- grounded
- practical
- no hype
- no fluff
- simple language
`
          },
          {
            role: "user",
            content: `User level: ${level}`
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content;

  } catch (error) {
    console.error("Groq error:", error.response?.data || error.message);
    throw new Error("Lesson generation failed");
  }
}

module.exports = generateLesson;
