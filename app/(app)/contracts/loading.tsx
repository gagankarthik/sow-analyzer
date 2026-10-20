import { ContractsListSkeleton } from "./_components/ContractsListSkeleton";

// Instant shell while the Contracts route loads: the list's own shape.
export default function ContractsLoading() {
  return <ContractsListSkeleton />;
}
