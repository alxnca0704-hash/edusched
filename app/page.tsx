import { redirectForRoleHome } from "@/hooks/useAuth";

export default async function Home() {
  await redirectForRoleHome();
}