import { DeanDashboard } from "@/components/DeanDashboard";
import { ROLES } from "@/constants/roles";
import { requireRole } from "@/hooks/useAuth";

export default async function DeanPage() {
  await requireRole(ROLES.dean);
  return <DeanDashboard />;
}