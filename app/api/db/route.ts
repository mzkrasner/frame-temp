import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import fs from "fs";
import path from "path";

// type Answer = {
//   id: number;
//   questionId: number;
//   salt: string;
//   hashedAnswer: string;
//   quizId: number;
//   quiz: Questions;
// };

type JsonQuestions = {
  question: string;
  options: { [key: string]: string };
  correctAnswer: string;
};

const prisma = new PrismaClient();

export async function GET(req: NextRequest): Promise<Response> {
  // Function to hash an answer with salt
  function hashAnswerWithSalt(answer: string) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hashedAnswer = crypto
      .createHmac("sha256", salt)
      .update(answer)
      .digest("hex");
    return { salt, hashedAnswer };
  }

  async function createQuizFromJSON() {
    // Read quiz.json file 
    const filePath = path.join(process.cwd(), "quiz.json");
    console.log(filePath);
    const fileData = fs.readFileSync(filePath, "utf-8");
    const quizData = JSON.parse(fileData);

    // Define quiz ID
    const quizId = 1; // You might need to generate or get this dynamically

    // Create questions
    const createdQuestions = await Promise.all(
      quizData.questions.map((q: JsonQuestions) =>
        prisma.questions.create({
          data: {
            question: q.question,
            answers: Object.values(q.options), // Store all options as a string array
          },
        })
      )
    );

    // Create answers with hashed values
    await Promise.all(
      quizData.questions.flatMap((q: JsonQuestions) =>
        Object.entries(q.options).map(([key, option]) => {
          const { salt, hashedAnswer } = hashAnswerWithSalt(option);
          return prisma.answer.create({
            data: {
              questionId: createdQuestions.find(
                (question) => question.question === q.question
              )?.id,
              question: q.question,
              salt,
              hashedAnswer,
              correct: key === q.correctAnswer,
              quizId,
            },
          });
        })
      )
    );

    console.log("Questions and Answers created successfully!");
  }

  createQuizFromJSON().catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });

  return NextResponse.json({ message: "Quiz created successfully!" });
}

export const dynamic = "force-dynamic";
