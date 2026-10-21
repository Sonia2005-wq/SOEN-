import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is missing. Please configure it in your backend .env file."
  );
}

const ai = new GoogleGenAI({ apiKey });

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const SYSTEM_INSTRUCTION = `
You are an expert MERN stack developer and AI application builder.

You must ALWAYS return one valid JSON object without Markdown fences.

For normal programming questions, use this structure:
{
  "text": "Your helpful answer",
  "fileTree": {},
  "buildCommand": null,
  "startCommand": null
}

When the user asks you to CREATE, BUILD, GENERATE, or MAKE an application:

1. Generate a complete, runnable React application using Vite.
2. Include every required file with complete, working source code.
3. Always include package.json, index.html, src/main.jsx, and src/App.jsx.
4. Add other files when needed.
5. Use this exact fileTree structure:

"fileTree": {
  "package.json": {
    "file": {
      "contents": "complete package.json contents"
    }
  },
  "index.html": {
    "file": {
      "contents": "complete HTML contents"
    }
  },
  "src/main.jsx": {
    "file": {
      "contents": "complete React entry point"
    }
  },
  "src/App.jsx": {
    "file": {
      "contents": "complete React application code"
    }
  }
}

6. Every file must contain actual code, not placeholders.
7. Ensure imports and dependencies are correct.
8. The application must run using npm install and npm run dev.
9. Do not return an empty fileTree when an application is requested.

For generated applications, return this structure:
{
  "text": "Brief description of the generated application",
  "fileTree": {
    "package.json": {
      "file": {
        "contents": "complete file contents"
      }
    },
    "index.html": {
      "file": {
        "contents": "complete file contents"
      }
    },
    "src/main.jsx": {
      "file": {
        "contents": "complete file contents"
      }
    },
    "src/App.jsx": {
      "file": {
        "contents": "complete file contents"
      }
    }
  },
  "buildCommand": {
    "mainItem": "npm",
    "commands": ["install"]
  },
  "startCommand": {
    "mainItem": "npm",
    "commands": ["run", "dev"],
    "env": {}
  }
}

Return ONLY valid JSON. No Markdown fences and no additional text outside the JSON.
`;

export async function generateResult(prompt) {
  try {
    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new Error("Prompt must be a non-empty string.");
    }

    console.log("Sending prompt to Gemini...");
    console.log("Model:", MODEL);

    const interaction = await ai.interactions.create({
      model: MODEL,
      input: prompt.trim(),
      system_instruction: SYSTEM_INSTRUCTION,
    });

    const responseText = interaction.output_text;

    if (typeof responseText !== "string" || !responseText.trim()) {
      console.error("Empty Gemini interaction:", interaction);
      throw new Error("Gemini returned an empty response.");
    }

    console.log("Gemini response received.");

    const cleanedResponse = responseText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    let parsedResponse;

    try {
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (error) {
      console.error("Invalid Gemini JSON.");
      console.error("Original response:", responseText);
      console.error("Cleaned response:", cleanedResponse);
      console.error("JSON parsing error:", error.message);

      throw new Error("Gemini returned invalid JSON.");
    }

    if (
      !parsedResponse ||
      typeof parsedResponse !== "object" ||
      Array.isArray(parsedResponse)
    ) {
      throw new Error("Gemini response must be a JSON object.");
    }

    const fileTree =
      parsedResponse.fileTree &&
      typeof parsedResponse.fileTree === "object" &&
      !Array.isArray(parsedResponse.fileTree)
        ? parsedResponse.fileTree
        : {};

    console.log("Generated file count:", Object.keys(fileTree).length);

    return JSON.stringify({
      text:
        typeof parsedResponse.text === "string"
          ? parsedResponse.text
          : "Application response generated.",
      fileTree,
      buildCommand: parsedResponse.buildCommand ?? null,
      startCommand: parsedResponse.startCommand ?? null,
    });
  } catch (error) {
    console.error("Gemini API Error:", {
      message: error.message,
      status: error.status,
      name: error.name,
    });

    throw error;
  }
}
