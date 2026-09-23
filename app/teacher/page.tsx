import { TeacherDashboard } from "@/components/TeacherDashboard";
import { ROLES } from "@/constants/roles";
import { requireRole } from "@/hooks/useAuth";

export default async function TeacherPage() {
  await requireRole(ROLES.teacher);
  return <TeacherDashboard />;
}