async function setup() {
  console.log("🚀 Provisioning default users via API...");

  const users = [
    { nom: "Director", email: "admin@test.com", password: "password", role: "admin" },
    { nom: "Agent One", email: "agent@test.com", password: "password", role: "agent" },
    { nom: "Customer", email: "client@test.com", password: "password", role: "client" }
  ];

  for (const u of users) {
    try {
      const res = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(u)
      });
      console.log(`✅ Registered ${u.email}`);
    } catch (e) {
      console.log(`❌ Failed to connect for ${u.email}: Make sure backend is running on port 3000`);
    }
  }
}
setup();
