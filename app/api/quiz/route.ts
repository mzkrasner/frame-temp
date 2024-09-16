import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function GET(req: NextRequest): Promise<Response> {
  const id = req.nextUrl.searchParams.get("id");
  const question = await prisma.questions.findUnique({
    where: { id: Number(id) },
  });

  const user = await prisma.participant.findFirst({
    where: { fid: 0 },
  });

  return NextResponse.json({ question, score: user?.score });
}

export async function POST(req: NextRequest): Promise<Response> {
  const { answer, questionId, fid } = await req.json();

  const dbAnswer = await prisma.answer.findFirst({
    where: {
      questionId: questionId,
      correct: true,
    },
  });

  if (!dbAnswer) {
    throw new Error("Answer not found");
  }

  const submittedHash = crypto
    .createHmac("sha256", dbAnswer.salt)
    .update(answer)
    .digest("hex");
  const isCorrect = submittedHash === dbAnswer.hashedAnswer;

  const existingParticipant = await prisma.participant.findUnique({
    where: { fid },
  });

  // Create participant if not exists
  if (!existingParticipant) {
    await prisma.participant.create({
      data: { fid, score: 0, takenAt: new Date(), questionsAnswered: [] },
    });
  }
  const questionAlreadyAnswered =
    existingParticipant?.questionsAnswered.includes(dbAnswer.question);

  // increment score if correct answer
  if (isCorrect && questionAlreadyAnswered === false) {
    await prisma.participant.update({
      where: { fid },
      data: {
        score: { increment: 1 },
      },
    });
  }

  // Update the questionsAnswered array
  await prisma.participant.update({
    where: { fid },
    data: {
      questionsAnswered: { push: dbAnswer.question },
    },
  });

  return NextResponse.json({ result: isCorrect });
}

export const dynamic = "force-dynamic";
