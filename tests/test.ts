import puppeteer from "puppeteer";
import assert from "assert";
import mlog from "mocha-logger";

async function startBrowser() {
  let browser = puppeteer.launch({
    headless: false,
    args: [`--disable-extensions-except=./dist`, `--load-extensions=./dist`],
  });
  return browser;
}

let browser: puppeteer.Browser | undefined = undefined;

describe("content.ts", () => {
  before(async () => (browser = await startBrowser()));
  after(async () => browser!!.close());

  describe("tooltip", async () => {
    it("should open on triple click", async () => {
      const wikipedia = await browser!!.newPage();
      await wikipedia.goto("https://en.wikipedia.org/wiki/Highlight");
      mlog.success("wikipedia loaded");

      const selector = "#firstHeading";
      await wikipedia.click(selector, { clickCount: 3 });
      const selection = await wikipedia.evaluate(() =>
        window.getSelection()?.toString()
      );
      assert.ok(selection);
      assert.equal(selection, "Highlight\n");
      mlog.success("header selected");

      await wikipedia.waitForTimeout(500);
      const tooltip = await wikipedia.$("#hl-tool");
      assert.ok(tooltip);
      mlog.success("hl-tool rendered");

      await wikipedia.mouse.move(0, 300);
      await wikipedia.click(
        "#mw-content-text > div.mw-parser-output > ul:nth-child(4)"
      );

      await wikipedia.waitForTimeout(500);
      const tooltipAfter = await wikipedia.$("#hl-tool");
      assert.ok(!tooltipAfter);
      mlog.success("hl-tool closed");
    }).timeout(0);
  });
});
