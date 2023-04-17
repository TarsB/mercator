import AWS from "aws-sdk";
import { ServiceConfigurationOptions } from "aws-sdk/lib/service";
import { Consumer } from "sqs-consumer";
import Producer from "sqs-producer";
import * as metrics from "./metrics.js";
import * as scraper from "./scraper.js";
import config from "./config.js";
import { computePath } from "./util.js";

const sqsOptions: ServiceConfigurationOptions = {};
if (config.sqs_endpoint) {
    sqsOptions.endpoint = config.sqs_endpoint;
}
const sqs = new AWS.SQS(sqsOptions);

const s3Options: ServiceConfigurationOptions = {};
if (config.s3_endpoint) {
    s3Options.endpoint = config.s3_endpoint;
    s3Options.s3ForcePathStyle = true;
}
const s3 = new AWS.S3(s3Options);

export async function getQueueUrl(queueName: string) {
    const queueUrlResponse = await sqs.getQueueUrl({ QueueName: queueName }).promise();
    return queueUrlResponse.QueueUrl;
}

getQueueUrl(config.sqs_input_queue).then(queueUrl => metrics.sqsMetrics(sqs, queueUrl!));

export function createProducer(queueName: string) {
    return Producer.create({
        queueUrl: queueName,
        sqs: sqs
    });
}

export function createConsumer(queueName: string, handleMessage: (message: AWS.SQS.Types.Message) => Promise<void>) {
    const consumer = new Consumer({
        queueUrl: queueName,
        sqs: sqs,
        visibilityTimeout: 60,
        waitTimeSeconds: 20,

        handleMessage: handleMessage
    });

    consumer.on("error", (err: Error) => {
        console.error("SQS error: " + err.message);
    });

    consumer.on("processing_error", (err: Error) => {
        console.error("processing_error: " + err.message);
    });

    return consumer;
}

function clean(result: scraper.ScraperResult) {
    delete result.htmlData;
    delete result.screenshotData;
    delete result.harData;

    return result;
}


export function s3UploadFile(data: string | void | Buffer, filename: string, prefix: string, contentType?: string) {
    if (!data)
        return Promise.resolve("");

    const params = {
        Bucket: config.s3_bucket_name,
        Key: prefix + "/" + filename,
        Body: data,
        ContentType: contentType
    };

    console.log("Uploading item [%s]", params.Key);

    return s3.upload(params).promise().then(putObjectPromise => {
        console.log("Key = [%s]", putObjectPromise.Key);
        return putObjectPromise.Key;
    }).catch(err => {
        throw new Error(`Upload failed for file [${params.Key}] : [${JSON.stringify(err)}]`);
    });
}

export async function uploadToS3(result: scraper.ScraperResult) {
    const url = new URL(result.request.url);
    result.bucket = config.s3_bucket_name;
    const prefix = computePath(url);
    const s3UploadResults:Promise<string | number>[] = [];

    console.log("BEFORE checkHtmlSize dataLength=[%s] max=[%s]", result.htmlLength, config.max_content_length)
    if (result.htmlLength!= undefined && result.htmlLength < config.max_content_length) {
        log("checkHtmlSize dataLength=[%s] max=[%s]", result.htmlLength, config.max_content_length)
        result.htmlSkipped = false
        s3UploadResults.push(s3UploadFile(result.htmlData, result.pathname || "index.html", prefix, "text/html").then(key => result.htmlFile = key).catch((err) => result.errors.push(err.message)));
    }
    if (result.htmlLength== undefined || result.htmlLength >= config.max_content_length){
        log("uploading of html to S3 cancelled since html size [%s] is bigger then %s", result.htmlLength, config.max_content_length)
        result.htmlSkipped = true
    }
    log("Uploading to S3 [%s]", prefix);
    s3UploadResults.push(s3UploadFile(result.screenshotData, "screenshot.", prefix, "image/").then(key => result.screenshotFile = key).catch((err) => result.errors.push(err.message)));
    s3UploadResults.push(s3UploadFile(result.harData, result.hostname + ".har", prefix, "application/json").then(key => result.harFile = key).catch((err) => result.errors.push(err.message)));
    return Promise.all(s3UploadResults).then(() => result);
}

function log(...data: any[]) {
  if (config.verbose) {
      console.log(data)
  }
}

export async function handleMessage(message: AWS.SQS.Types.Message) {
    const params = JSON.parse(message.Body!);

    if (params.url) {
        const result = await scraper.websnap(params)
            .then(result => uploadToS3(result))
            .then(result => clean(result));

        if (result.errors.length)
            console.log("Scraper returned with the following error : %s", result.errors.join("\n"));

        metrics.getProcessedUrlCounter().inc();

        log("Scraper returned with result [%s]", JSON.stringify(result));
        return result;
    } else {
        console.error("ERROR: message on SQS did not have a URL specified.");
        console.error(message.Body!);
        console.error(params);
        console.error(params.url);
    }
}

export async function createHandler(producer: Producer): Promise<(message: AWS.SQS.Types.Message) => Promise<void>> {
    return async (message: AWS.SQS.Types.Message) => {
        const scraperResult = await handleMessage(message);
        if (scraperResult) {
            producer.send({
                id: scraperResult.id,
                body: JSON.stringify(scraperResult)
            }, function (err: Error) {
                if (err) console.log("Failed to send message to SQS: " + err);
            });
        }
    };
}
