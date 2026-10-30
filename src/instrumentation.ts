/** Runs once at server start. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkRequiredSettings } = await import("./lib/required-settings");
  checkRequiredSettings();
}
