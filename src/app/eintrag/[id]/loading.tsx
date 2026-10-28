import { ListSkeleton } from "@/components/skeleton";

export default function Loading() {
  return <ListSkeleton header={false} rows={5} />;
}
