export const metadata = { title: "Sign in · AetherAI Radar" };

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const failed = params?.error === "1";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="label">AetherAI / Intelligence unit</p>
      <h1 className="mt-3 font-display text-6xl uppercase leading-none tracking-[-0.04em] text-phosphor">
        Radar<span className="text-hazard">.</span>
      </h1>
      <form method="post" action="/api/login" className="mt-8 space-y-4">
        <label className="block">
          <span className="label mb-1.5 block">Password</span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full border border-line bg-crt px-3 py-2 text-[14px] text-phosphor focus:border-phosphor focus:outline-none"
          />
        </label>
        {failed && (
          <p role="alert" className="text-[12px] uppercase tracking-[0.08em] text-hazard">
            Wrong password. Try again.
          </p>
        )}
        <button
          type="submit"
          className="w-full border border-phosphor px-4 py-2 text-[12px] uppercase tracking-[0.1em] text-phosphor hover:bg-phosphor hover:text-crt"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
