import { generateHandQualityQuestion } from "@/lib/plo4/quizGenerator";
import { HandQualityQuizClient } from "./HandQualityQuizClient";

export default function PLO4HandQualityPage() {
  return <HandQualityQuizClient initialQuestion={generateHandQualityQuestion() as Parameters<typeof HandQualityQuizClient>[0]["initialQuestion"]} />;
}
