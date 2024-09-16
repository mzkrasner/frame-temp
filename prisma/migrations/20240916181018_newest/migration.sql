/*
  Warnings:

  - A unique constraint covering the columns `[question]` on the table `Answer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `question` to the `Answer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "question" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Answer_question_key" ON "Answer"("question");
