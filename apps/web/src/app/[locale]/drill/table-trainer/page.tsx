import TableTrainerClient from "./TableTrainerClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function TableTrainerPage() {
  return (
    <ErrorBoundary>
      <TableTrainerClient />
    </ErrorBoundary>
  );
}
