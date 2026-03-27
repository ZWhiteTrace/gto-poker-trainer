import { generateBestHandQuestion } from "@/lib/plo4/quizGenerator";
import { BestHandQuizClient } from "./BestHandQuizClient";

export default function PLO4BestHandPage() {
  return <BestHandQuizClient initialQuestion={generateBestHandQuestion() as Parameters<typeof BestHandQuizClient>[0]["initialQuestion"]} />;
}
