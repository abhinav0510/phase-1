import { asFounder, asTeam, expect, ID, state, test } from "./helpers";

// Just enough of an .xlsx for the byte check: a zip holding xl/workbook.xml.
const XLSX = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("\0\0xl/workbook.xml\0\0")]);
const upload = (name: string, buffer: Buffer) => ({
  name,
  mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  buffer,
});
const own = async (startupId: number) => (await state("startup_mis_files")).filter((f) => f.startup_id === startupId);

test.describe("MIS upload", () => {
  test("upload beside the statements link, download it, then remove it", async ({ page }) => {
    await asFounder(page, ID.zeta);
    await page.goto("/complete-profile");
    await expect(page.getByRole("button", { name: "Upload MIS" })).toBeVisible();
    await page.locator("#pf-mis").setInputFiles(upload("MIS Oct 2026.xlsx", XLSX));
    await expect(page.locator("#mis")).toContainText("Uploaded");
    await expect(page.locator("#mis")).toContainText("MIS Oct 2026.xlsx");

    const [saved] = await own(ID.zeta);
    expect(saved.file_path).toMatch(new RegExp(`^${ID.zeta}/mis-\\d+\\.xlsx$`));
    expect(await state("startups").then((rows) => JSON.stringify(rows))).not.toContain("MIS Oct 2026");

    const file = await page.request.get(`/api/mis/${saved.id}`);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-disposition"]).toContain('attachment; filename="MIS Oct 2026.xlsx"');
    expect(file.headers()["x-content-type-options"]).toBe("nosniff");

    await page.getByRole("button", { name: "Remove MIS Oct 2026.xlsx" }).click();
    await expect(page.locator("#mis")).toContainText("File removed");
    await expect.poll(async () => (await own(ID.zeta)).length).toBe(0);
  });

  test("a file that isn't really Excel is refused", async ({ page }) => {
    await asFounder(page, ID.zeta);
    await page.goto("/complete-profile");
    await page.locator("#pf-mis").setInputFiles(upload("numbers.xlsx", Buffer.from("name,amount\nA,1")));
    await expect(page.locator("#mis")).toContainText(/Excel file/);
    expect(await own(ID.zeta)).toHaveLength(0);
  });

  test("only the startup's founder and the team can download it", async ({ page, browser }) => {
    await asFounder(page, ID.zeta);
    await page.goto("/complete-profile");
    await page.locator("#pf-mis").setInputFiles(upload("MIS.xlsx", XLSX));
    await expect(page.locator("#mis")).toContainText("Uploaded");
    const [saved] = await own(ID.zeta);

    const other = await browser.newPage();
    await asFounder(other, ID.eta);
    expect((await other.request.get(`/api/mis/${saved.id}`)).status()).toBe(404);
    await other.close();

    const signedOut = await browser.newPage();
    // Middleware sends signed-out visitors to sign in before the route runs.
    const anon = await signedOut.request.get(`/api/mis/${saved.id}`, { maxRedirects: 0 });
    expect([302, 303, 307, 308, 401, 404]).toContain(anon.status());
    expect(anon.headers()["content-disposition"]).toBeUndefined();
    await signedOut.close();

    const team = await browser.newPage();
    await asTeam(team);
    await team.goto(`/admin/startups/${ID.zeta}`);
    await expect(team.getByText("MIS from the founder")).toBeVisible();
    await expect(team.getByRole("link", { name: /MIS\.xlsx/ })).toBeVisible();
    expect((await team.request.get(`/api/mis/${saved.id}`)).status()).toBe(200);
    await team.close();
  });
});
