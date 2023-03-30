package be.dnsbelgium.mercator.vat.domain;


import be.dnsbelgium.mercator.vat.metrics.MetricName;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import okhttp3.HttpUrl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.DisabledIf;
import org.slf4j.Logger;
import java.io.IOException;
import java.net.UnknownHostException;
import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.slf4j.LoggerFactory.getLogger;

@SuppressWarnings("HttpUrlsUsage")
class PageFetcherTest {

  private final MeterRegistry meterRegistry = new SimpleMeterRegistry();
  private final PageFetcher pageFetcher = new PageFetcher(meterRegistry, PageFetcherConfig.defaultConfig());
  private static final Logger logger = getLogger(PageFetcherTest.class);

  private static boolean isHttpbinDisabled() {
    return true;
  }



  @Test
  public void fetchGoogle() throws IOException {
    HttpUrl url = HttpUrl.get("http://www.google.be");
    Instant beforeFetch = Instant.now();
    pageFetcher.clearCache();
    Page page = pageFetcher.fetch(url);
    logger.info("page = {}", page);
    assertThat(page.getUrl().toString()).contains("www.google.be");
    assertThat(page.getResponseBody().length()).isGreaterThan(1);
    assertThat(page.getVisitStarted()).isAfterOrEqualTo(beforeFetch);
    assertThat(page.getVisitFinished()).isAfterOrEqualTo(beforeFetch);
    assertThat(page.getStatusCode()).isEqualTo(200);

    Page fetchAgain = pageFetcher.fetch(url);
    assertThat(fetchAgain.getVisitStarted()).isEqualTo(page.getVisitStarted());

  }

  @Test
  @DisabledIf(value = "isHttpbinDisabled", disabledReason="Tests using HttpBin are disabled (sometimes it is very slow")
  public void visitDuration() throws IOException {
    Page page = pageFetcher.fetch(HttpUrl.get("http://httpbin.org/delay/0.5"));
    Instant started = page.getVisitStarted();
    Instant finshed = page.getVisitFinished();
    Duration duration = Duration.between(started, finshed);
    logger.info("page.getVisitDuration = {}", duration);
    assertThat(duration.toMillis()).isBetween(500L, 2000L);
  }

  @Test
  @DisabledIf(value = "isHttpbinDisabled", disabledReason="Tests using HttpBin are disabled (sometimes it is very slow")
  public void statusCode() throws IOException {
    Page page = pageFetcher.fetch(HttpUrl.get("http://httpbin.org/status/599"));
    assertThat(page.getStatusCode()).isEqualTo(599);
  }

  @Test
  public void fetchFromUnknownHost() {
    assertThrows(UnknownHostException.class,
        () -> pageFetcher.fetch(HttpUrl.get("http://no.webserver.at.this.url")));
  }

  @Test
  public void test404() throws IOException {
    HttpUrl url = HttpUrl.get("http://www.dnsbelgium.be/this page does not exist");
    Page page = pageFetcher.fetch(url);
    logger.info("page = {}", page);
    logger.info("page.statusCode = {}", page.getStatusCode());
    assertThat(page.getStatusCode()).isEqualTo(404);
    assertThat(page.getDocument().text()).isNotBlank();
  }

  @Test
  public void close() throws IOException {
    HttpUrl url = HttpUrl.get("http://www.google.com/");
    Page page = pageFetcher.fetch(url);
    assertThat(page.getStatusCode()).isEqualTo(200);
    pageFetcher.close();
    // a fetch call will now throw an IllegalStateException
    assertThrows(IllegalStateException.class,
        () -> pageFetcher.fetch(url));
  }

  @Test
  public void fetchPdf() throws IOException {
    String url = "https://assets.dnsbelgium.be/attachment/Wijziging-gemachtigde-DomainGuard-nl_0.pdf";
    Page page = pageFetcher.fetch(HttpUrl.get(url));
    logger.info("page = {}", page);
    assertThat(page).isEqualTo(Page.CONTENT_TYPE_NOT_SUPPORTED);
  }

  @Test
  @DisabledIf(value = "isHttpbinDisabled", disabledReason="Tests using HttpBin are disabled (sometimes it is very slow")
  public void fetchPng() throws IOException {
    HttpUrl url = HttpUrl.get("http://httpbin.org/image/png");
    Page page = pageFetcher.fetch(url);
    logger.info("page = {}", page);
    assertThat(page).isEqualTo(Page.CONTENT_TYPE_NOT_SUPPORTED);
  }

  @Test
  @DisabledIf(value = "isHttpbinDisabled", disabledReason="Tests using HttpBin are disabled (sometimes it is very slow")
  public void fetchSvg() throws IOException {
    HttpUrl url = HttpUrl.get("http://httpbin.org/image/svg");
    Page page = pageFetcher.fetch(url);
    logger.info("page = {}", page);
    assertThat(page).isEqualTo(Page.CONTENT_TYPE_NOT_SUPPORTED);
  }

  @Test
  @DisabledIf(value = "isHttpbinDisabled", disabledReason="Tests using HttpBin are disabled (sometimes it is very slow")
  public void fetchWebp() throws IOException {
    HttpUrl url = HttpUrl.get("http://httpbin.org/image/webp");
    Page page = pageFetcher.fetch(url);
    logger.info("page = {}", page);
    assertThat(page).isEqualTo(Page.CONTENT_TYPE_NOT_SUPPORTED);
  }

  @Test
  @DisabledIf(value = "isHttpbinDisabled", disabledReason="Tests using HttpBin are disabled (sometimes it is very slow")
  public void fetchJpeg() throws IOException {
    HttpUrl url = HttpUrl.get("http://httpbin.org/image/jpeg");
    Counter counter = meterRegistry.counter(MetricName.COUNTER_PAGES_CONTENT_TYPE_NOT_SUPPORTED,
        "content-type", "image/jpeg");
    double before = counter.count();
    Page page = pageFetcher.fetch(url);
    logger.info("page = {}", page);
    assertThat(page).isEqualTo(Page.CONTENT_TYPE_NOT_SUPPORTED);
    assertThat(counter.count()).isEqualTo(before + 1);
  }

  @Test
  @DisabledIf(value = "isHttpbinDisabled", disabledReason="Tests using HttpBin are disabled (sometimes it is very slow")
  public void headers() throws IOException {
    HttpUrl url = HttpUrl.get("http://httpbin.org/anything");
    Page page = pageFetcher.fetch(url);
    logger.info("page = {}", page);
    logger.info("page.text = {}", page.getDocument().text());
    assertThat(page.getDocument().text()).contains("\"User-Agent\": \"Mozilla/5.0 ");
  }

  @Test
  @DisplayName("https://www.dnsbelgium.com/")
  public void https_dnsbelgium_dot_com() throws IOException {

    // fetching "https://www.dnsbelgium.com/"
    // The code below works in IntelliJ IDEA
    // => it logs "Failed to fetch https://www.dnsbelgium.com/ because of Received fatal alert: unrecognized_name"

    // But test fails on Jenkins:  Failed to connect to www.dnsbelgium.com/2a02:e980:53:0:0:0:0:8b:443
    // Suppressed: javax.net.ssl.SSLHandshakeException: Received fatal alert: unrecognized_name
    // perhaps because Jenkins doesn't do IPv6 ?
    // or rather because certificate doesn't match?
    // curl says: error:14004458:SSL routines:CONNECT_CR_SRVR_HELLO:tlsv1 unrecognized name

    // fetch will fail because of Received fatal alert: unrecognized_name
    Page page = pageFetcher.fetch(HttpUrl.get("https://www.dnsbelgium.com/"));
    logger.info("page = {}", page);
    assertThat(page.getStatusCode()).isEqualTo(0);
  }


  @Test
  @DisplayName("http://www.dnsbelgium.com/")
  public void http_dnsbelgium_dot_com() throws IOException {
    Page page = pageFetcher.fetch(HttpUrl.get("http://www.dnsbelgium.com/"));
    logger.info("page = {}", page);
    assertThat(page.getStatusCode()).isEqualTo(200);
  }

  @Test
  public void fetchPageWithoutContentLengthHeaderAndBodyLengthOverMax() throws IOException {
    PageFetcher testFetcher = new PageFetcher(meterRegistry, PageFetcherConfig.testConfig());
    testFetcher.clearCache();
    Page page = testFetcher.fetch(HttpUrl.get("http://www.google.be"));
    assertThat(page).isEqualTo(Page.PAGE_TOO_BIG);
  }
}