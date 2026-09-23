import { createClerkClient } from "@clerk/nextjs/server";

const clerk = createClerkClient({
  secretKey: requireEnv("CLERK_SECRET_KEY"),
});

type Role = "dean" | "teacher";

interface SeedUser {
  email: string;
  password: string;
  role: Role;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const seedUsers: SeedUser[] = [
  {
    email: requireEnv("SEED_DEAN_EMAIL"),
    password: requireEnv("SEED_DEAN_PASSWORD"),
    role: "dean",
  },
  {
    email: requireEnv("SEED_TEACHER_EMAIL"),
    password: requireEnv("SEED_TEACHER_PASSWORD"),
    role: "teacher",
  },
];

async function upsertUser({ email, password, role }: SeedUser) {
  const { data } = await clerk.users.getUserList({ emailAddress: [email] });

  if (data.length > 0) {
    const user = data[0];
    const currentRole = user.publicMetadata?.role as Role | undefined;

    if (currentRole !== role) {
      await clerk.users.updateUser(user.id, {
        publicMetadata: { ...user.publicMetadata, role },
      });
      console.log(`updated ${email} (${user.id}) role -> ${role}`);
    } else {
      console.log(`ok ${email} (${user.id}) already ${role}`);
    }
    return;
  }

  const created = await clerk.users.createUser({
    emailAddress: [email],
    password,
    publicMetadata: { role },
  });
  console.log(`created ${email} (${created.id}) as ${role}`);
}

async function main() {
  for (const user of seedUsers) {
    await upsertUser(user);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});