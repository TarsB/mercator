import puppeteer from "puppeteer";
import * as path from "path";
import {URL} from "url";
import {v4 as uuid} from "uuid";
import treekill from "tree-kill";
import {publicIpv4, publicIpv6} from "public-ip";

import * as metrics from "./metrics.js";

import {harFromMessages} from "chrome-har";

const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 1200;
const GOTO_TIMEOUT = 15000;

// event types to observe
const observe = [
    "Page.loadEventFired",
    "Page.domContentEventFired",
    "Page.frameStartedLoading",
    "Page.frameAttached",
    "Network.requestWillBeSent",
    "Network.requestServedFromCache",
    "Network.dataReceived",
    "Network.responseReceived",
    "Network.resourceChangedPriority",
    "Network.loadingFinished",
    "Network.loadingFailed",
];

// See be.dnsbelgium.mercator.content.ports.async.model.ResolveContentRequestMessage
export interface ScraperParams {
    url: string;
    referer: string | null;

    visitId: string;

    screenshotOptions: puppeteer.ScreenshotOptions;
    browserOptions: puppeteer.BrowserConnectOptions;

    saveHtml: boolean;
    saveScreenshot: boolean;
    saveHar: boolean;
    retries: number;
}

// See be.dnsbelgium.mercator.content.ports.async.model.ResolveContentResponseMessage
export interface ScraperResult {
    id: string;
    hostname?: string;
    bucket?: string;
    url?: string;
    htmlLength?: number;
    htmlData?: string;
    htmlFile?: string;
    pathname?: string;
    metrics?: puppeteer.Metrics;
    pageTitle?: string;
    harData?: string;
    harFile?: string;
    screenshotData?: void | Buffer;
    screenshotFile?: string;
    browserVersion?: string;
    ipv4: string;
    ipv6: string;
    request: ScraperParams;
    errors: string[];
    htmlSkipped: boolean;
    screenshotSkipped: boolean;
    harSkipped: boolean;
    screenshotType: string;
}

let browser: puppeteer.Browser;
let page: puppeteer.Page;
let ipv4, ipv6;

export function isBrowserConnected() {
    if (browser) {
        return browser.isConnected();
    }
    return false;
}

export async function setup() {
    const browserOptions: puppeteer.BrowserConnectOptions = {
        defaultViewport: {
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT
        },
    };

    browser = await puppeteer.launch({
        ...browserOptions,
        ignoreHTTPSErrors: true,
        handleSIGTERM: false,
        handleSIGINT: false,
        args: [
            "--enable-logging=stderr",
            "--v=0",
            // See https://www.cnblogs.com/baihuitestsoftware/p/10562909.html
            "--disable-accelerated-2d-canvas",
            "--disable-breakpad",
            "--disable-client-side-phishing-detection",
            "--disable-cloud-import",
            "--disable-default-apps",
            "--disable-dev-shm-usage",
            "--disable-extensions",
            "--disable-gesture-typing",
            "--disable-gpu",
            "--disable-hang-monitor",
            "--disable-infobars",
            "--disable-notifications",
            "--disable-offer-store-unmasked-wallet-cards",
            "--disable-offer-upload-credit-cards",
            //'--disable-popup-blocking',
            "--disable-print-preview",
            "--disable-prompt-on-repost",
            "--disable-setuid-sandbox",
            "--disable-software-rasterizer",
            "--disable-speech-api",
            "--disable-sync",
            "--disable-tab-for-desktop-share",
            "--disable-translate",
            "--disable-voice-input",
            "--disable-wake-on-wifi",
            "--disable-web-security",
            "--enable-async-dns",
            "--enable-font-antialiasing",
            "--enable-simple-cache-backend",
            "--enable-tcp-fast-open",
            "--enable-webgl",
            "--font-render-hinting=none",
            "--headless",
            "--hide-scrollbars",
            "--ignore-certifcate-errors",
            "--ignore-certifcate-errors-spki-list",
            "--ignore-gpu-blacklist",
            // '--media-cache-size=33554432',
            "--memory-pressure-off",
            "--metrics-recording-only",
            "--mute-audio",
            "--no-default-browser-check",
            "--no-first-run",
            "--no-pings",
            "--no-sandbox",
            "--no-zygote",
            "--password-store=basic",
            "--prerender-from-omnibox=disabled",
            "--use-gl=swiftshader",
            "--use-mock-keychain",
            "--window-position=0,0",
        ]
    });

    new Promise<void>(resolve =>
        browser.on("disconnected", async () => {
            console.log("Browser closed, reloading it");
            await browser.close();
            resolve();
        })
    ).then(setup);

    browser.process()!.stderr!.on("data", function (logData) {
        //this does not properly prefix, as logData chunks can have newlines, but maybe good enough for now
        // (we would be better off to invest in a better logging platform first, anyway)
        console.log("BROWSER | " + logData.toString());
    });

    console.log(`Started Puppeteer with pid ${browser.process()!.pid}`);
}

(async () => {
    await Promise.all([
        publicIpv4({ onlyHttps: true }).then(result => {
            ipv4 = result;
            console.log("IPv4: [%s]", ipv4);
        }).catch(err => console.log("Cannot determine IPv4 : %s", err)),

        publicIpv6({ onlyHttps: true }).then(result => {
            ipv6 = result;
            console.log("IPv6: [%s]", ipv6);
        }).catch(err => console.log("Cannot determine IPv6 : %s", err))
    ])

    await setup();
})();

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function shutdown() {
    await delay(5000); // waiting that everything stops

    console.log("Closing Puppeteer");

    if (page) {
        page.removeAllListeners("error");
        await page.close();
    }
    if (browser) {
        browser.removeAllListeners("disconnected");
        await browser.close();
    }

    await new Promise<void>(resolve => treekill(browser.process()!.pid!, "SIGKILL", () => {
        console.log("Chrome instances killed");
        resolve();
    }));
    return;
}

function setReferer(page: puppeteer.Page, referer: string) {
    if (referer) {
        console.log("Setting the referer to [%s]", referer);
        return page.setExtraHTTPHeaders({
            referer: referer
        });
    } else {
        console.log("Not setting the referer");
    }
}

function saveHar(params: ScraperParams, events: Event[]) {
    if (params.saveHar) {
        return JSON.stringify(harFromMessages(events));
    } else {
        console.log("Not saving .har file");
    }
}

function takeScreenshot(params: ScraperParams, page: puppeteer.Page): Promise<Buffer> {
    console.log("screenshotOptions = [%s]", JSON.stringify(params.screenshotOptions));
    if (params.saveScreenshot && params.screenshotOptions) {
        params.screenshotOptions.type = params.screenshotOptions.type || "webp";
        params.screenshotOptions.fullPage = params.screenshotOptions.fullPage || true;
        params.screenshotOptions.omitBackground = params.screenshotOptions.omitBackground || false;
        params.screenshotOptions.encoding = params.screenshotOptions.encoding || "binary";
        params.screenshotOptions.quality = params.screenshotOptions.quality || 100;
        return page.screenshot(params.screenshotOptions).then(screenshot => {
            // Because we use encoding binary, this will never be a string
            return screenshot as Buffer;
        });
    } else {
        return Promise.reject("Not taking a screenshot");
    }
}

async function saveHtml(params: ScraperParams, page: puppeteer.Page): Promise<string> {
    if (params.saveHtml) {
        console.log("Saving html");
        return page.content();
    } else {
        console.log("Not saving html");
        return Promise.reject();
    }
}

async function registerHarEventListeners(page: puppeteer.Page, events: any[]) {
    // register events listeners
    try {
        const client = await page.target().createCDPSession();
        await client.send("Page.enable");
        await client.send("Network.enable");
        observe.forEach(method => {
            client.on(method, params => {
                events.push({ method, params });
            });
        });
    } catch (e) {
        console.error("Failed to register event listeners: " + e);
        return Promise.reject("Failed to register event listeners");
    }
}

async function snap(page: puppeteer.Page, params: ScraperParams): Promise<ScraperResult> {
    const result: ScraperResult = {
        id: uuid(),
        ipv4: ipv4,
        ipv6: ipv6,
        request: params,
        errors: [],
        screenshotType: params.screenshotOptions.type ?? "webp",
        harSkipped: false,
        screenshotSkipped: false,
        htmlSkipped: false,
    };

    let timeoutId;

    try {
        const url = new URL(params.url);
        console.log("url = [%s]", url);

        // Set up a timeout in which muppets should be able to snap the website. Otherwise, trigger an error.
        new Promise((resolve) => {
            timeoutId = setTimeout(resolve, 60000);
        })
            .then(() => console.error(`[${url}] timed out!`))
            .then(() => page.close())
            .then(() => browser.close());

        // TODO: Should that be from url or final url ?
        result.hostname = url.hostname;

        if (params.referer)
            await setReferer(page, params.referer);

        // list of events for converting to HAR
        const events: Event[] = [];
        if (params.saveHar) {
            await registerHarEventListeners(page, events);
        }

        if (params.retries) {
            console.log("Easing conditions as this is a retry");
            await page.goto(params.url, { waitUntil: "domcontentloaded", timeout: GOTO_TIMEOUT });
        } else {
            await page.goto(params.url, { waitUntil: "networkidle2", timeout: GOTO_TIMEOUT });
        }

        result.url = page.url();
        result.pathname = path.extname(new URL(result.url).pathname).trim().match(/\/?/) ? "index.html" : url.pathname;
        console.log("page.url = [%s]", result.url);

        result.harData = saveHar(params, events);

        // Get all data
        await Promise.all([
            page.metrics().then(output => { result.metrics = output; }),
            page.title().then(output => { result.pageTitle = output; }),
            page.browser().version().then(output => { result.browserVersion = output; }),
            saveHtml(params, page).then(output => { result.htmlData = output; result.htmlLength = result.htmlData ? result.htmlData.length : 0 }),
            takeScreenshot(params, page).then(output => { result.screenshotData = output })
        ]);

        console.log(result);
        result.screenshotType = params.screenshotOptions.type ?? "webp";
        await page.close();

        console.log("Snap finished");

        return { ...result };

    } catch (e) {
        if (e instanceof Error) {
            console.error("Error caught [%s]", e.message);
            if (e.message === `Navigation timeout of ${GOTO_TIMEOUT} ms exceeded`) {
                metrics.getDomainTimeOuts().inc();
            }
            result.errors.push(e.message);
        } else {
            console.error("Something happened [%s]", e);
        }
        return result;
    } finally {
        if (timeoutId)
            clearTimeout(timeoutId);
    }
}

export async function websnap(params: ScraperParams): Promise<ScraperResult> {
    try {
        while (!browser || !browser.isConnected()) {
            console.log("browser is not ready");
            await delay(500);
        }
        console.log("websnap called with params [%s]", JSON.stringify(params));

        const endProcessingTimeHist = metrics.getProcessingTimeHist().startTimer();

        let page = await browser.newPage();
        await page.setCacheEnabled(false);

        // Error handling
        page.once("error", err => {
            if (err instanceof Error) {
                console.error("Page error caught [%s]", err.message);
            } else {
                console.error("Page error caught [%s]", err);
            }
            page.close().then(() => browser.close()).catch(err => console.error("Failed to handle error: " + err.message));
        });
        const scraperResult = await snap(page, params);
        endProcessingTimeHist();

        try {
            page.close().catch(_ => { });
        } catch (Exception) {
            // Crashes if page is closed already (because of an error)
        }
        return scraperResult;
    } catch (exception) {
        throw exception;
    }
}
