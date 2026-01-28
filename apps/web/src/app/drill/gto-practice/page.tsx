import { redirect } from "next/navigation";

// Redirect to the new full table trainer
export default function GTOPracticePage() {
  redirect("/drill/table-trainer");
}
