import Wappalyzer from "./Wappalyzer";
import moment from "moment";
import {Row, Col, Table, Card} from "react-bootstrap";
import {useEffect, useState} from "react";
import api from "../../services/api";
import {differenceBetweenTwoDates, renderDataBoolean} from '../../services/Util';


const ContentCrawlCard = (props) => {
    const visitId = props.visitId

    const [data, setData] = useState([]);
    const [showImage, setShowImage] = useState(false);
    const [showHtml, setShowHtml] = useState(false);
    const [showRawHtml, setShowRawHtml] = useState(false);

    const showPopup = (item) => {
        const DEV_URL = window._env_.REACT_APP_MUPPETS_HOST;

        if (item.htmlKey !== null) {
            return (
                <>
                    <h6>Do you want to open and render the html in a new tab ?</h6>
                    <div>
                        <button
                            id="acceptHtmlNewTab"
                            className="mr-5 ml-5 content-card-link-button"
                            onClick={() => window.open(DEV_URL + "/" + item.htmlKey)}
                        >
                            Yes
                        </button>

                        <button
                            id="declineHtmlNewTab"
                            className="mr-5 ml-5 content-card-link-button"
                            onClick={() => setShowHtml(state => !state)}
                        >
                            No
                        </button>
                    </div>
                </>
            )
        }
        return (
            <p>No html found</p>
        );
    }

    const showScreenshot = (item) => {
        // URL for development / local environment.
        const DEV_URL = window._env_.REACT_APP_MUPPETS_HOST;
        const LOCAL_URL = 'http://localhost:4566/mercator-muppets';

        if (item.screenshotKey !== null) {
            return (
                <img
                    className="screenshotImagePreview"
                    src={`${DEV_URL}/${item.screenshotKey}`}
                    alt={`Thumbnail of ${item.visitId}`}
                >
                </img>
            )
        }
        return (
            <p>No image found</p>
        );
    }

    const showHtmlPreview = (item) => {
        // URL for development / local environment.
        const DEV_URL = window._env_.REACT_APP_MUPPETS_HOST;
        const LOCAL_URL = 'http://localhost:4566/mercator-muppets';

        if (item.screenshotKey !== null) {
            return (
                <iframe src={`${DEV_URL}/${item.htmlKey}`} frameborder="0"></iframe>
            )
        }
        return (
            <p>No html found</p>
        );
    }

    useEffect(() => {
        const handlerData = async () => {

            const url = `/contentCrawlResults/search/findByVisitId?visitId=${visitId}`;
            await api.get(url)
                .then((resp) => {
                    if (resp.status === 200) {
                        setData(resp === undefined ? null : resp.data._embedded.contentCrawlResults);
                    }
                })
                .catch((ex) => {
                    console.log(ex);
                });
        };

        handlerData();
    }, [visitId]);

    // Variables for HTML
    const {openMetrics, setOpenMetrics, openTechnologies, setOpenTechnologies, openUrls, setOpenUrls} = props; // Used deciding open/close of Accordions.
    const prefix = window._env_.REACT_APP_MUPPETS_HOST + "/" || '';
    // const prefix = "http://localhost:4566/mercator-muppets/"
    const title = <Card.Header as="h2" className="h5">Content crawl</Card.Header>;

    // Writing HTML on a function base so we can define logic more easily.
    const renderHTML = () => {

        if (!data.length || data.length === 0) {
            return (
                <Row>
                    <Col className='mt-4'>
                        <Card>
                            {title}
                            <Card.Body>No data for this visit</Card.Body>
                        </Card>
                    </Col>
                </Row>
            )
        }

        return (

            <>
                {
                    data.map((data) => {
                        return (
                            <Row key={data.visitId}>
                                <Col className='mt-4'>
                                    <Card>
                                        {title}
                                        <Card.Body className='content-table'>

                                            <Table size='sm' borderless>
                                                <tbody className='text-left'>

                                                    <tr>
                                                        <th scope='row'>
                                                            Id
                                                        </th>
                                                        <td>
                                                            {data.id}
                                                        </td>
                                                    </tr>

                                                    <tr>
                                                        <th scope='row'>
                                                            Metrics Json
                                                        </th>
                                                        <td>
                                                            {
                                                                data.metricsJson ? // metricsJson exists? render, else empty string.
                                                                    <>
                                                                        <button 
                                                                            className='more-info'
                                                                            onClick={() => setOpenMetrics(openMetrics => !openMetrics)} // Toggle openMetrics boolean
                                                                        > 
                                                                            More info
                                                                        </button>

                                                                        {   // if openMetrics === true, render
                                                                            openMetrics && (
                                                                                <div id='metrics-json-content'>
                                                                                    <ul className="mb-2 mt-2">
                                                                                        {
                                                                                            Object.entries(JSON.parse(data.metricsJson)).map((item, index) => {
                                                                                                return (
                                                                                                    <li key={index}>
                                                                                                        <span
                                                                                                            className='font-weight-bold'
                                                                                                        >
                                                                                                            { item[0] }:
                                                                                                        </span>
                                                                                                        <span> { item[1] }</span>
                                                                                                    </li>
                                                                                                )
                                                                                            })
                                                                                        }
                                                                                    </ul>
                                                                                </div>
                                                                            )
                                                                        }
                                                                    </> :
                                                                    "" // metricsJson exists? render, else empty string.
                                                            }
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <th scope="row">URL</th>
                                                        <td>{data.url}</td>
                                                    </tr>
                                                    <tr>
                                                        <th scope="row">Ok</th>
                                                        { renderDataBoolean(data.ok) }
                                                    </tr>
                                                    <tr>
                                                        <th scope="row">Problem</th>
                                                        <td className="defined-error">{data.problem}</td>
                                                    </tr>
                                                    <tr>
                                                        <th scope="row">Final Url</th>
                                                        <td>{data.finalUrl}</td>
                                                    </tr>
                                                    <tr>
                                                        <th scope="row">HTML length</th>
                                                        <td>{data.htmlLength}</td>
                                                    </tr>
                                                    <tr>
                                                        <th scope="row">Crawl Timestamp</th>
                                                        <td>{data.crawlTimestamp ? moment(data.crawlTimestamp).format("DD/MM/YYYY HH:mm:ss") : ''}</td>
                                                    </tr>
                                                    <tr>
                                                        <th scope="row">Retries</th>
                                                        <td>{data.retries}</td>
                                                    </tr>
                                                    <tr>
                                                        <th scope="row">Crawled from</th>
                                                        <td>ipv4: {data.ipv4}, ipv6: {data.ipv6}</td>
                                                    </tr>
                                                    <tr>
                                                        <th scope="row">Browser version</th>
                                                        <td>{data.browserVersion}</td>
                                                    </tr>
                                                </tbody>
                                            </Table>


                                            <div className="mb-4 mt-4 ml-4">


                                                <button
                                                    id="previewScreenshotBTN"
                                                    className="mr-5 ml-5 content-card-link-button"
                                                    onClick={() => setShowImage(state => !state)}
                                                >
                                                    Screenshot preview
                                                </button>

                                                <button
                                                    className="mr-5 ml-5 content-card-link-button"
                                                    onClick={() => window.open(prefix + data.screenshotKey)}
                                                >
                                                    Screenshot
                                                </button>

                                                <button
                                                    id="previewRawHtmlBTN"
                                                    className="mr-5 ml-5 content-card-link-button"
                                                    onClick={() => setShowRawHtml(state => !state)}
                                                >
                                                    HTML raw data
                                                </button>

                                                <button
                                                    className="mr-5 ml-5 content-card-link-button"
                                                    onClick={() => setShowHtml(state => !state)}
                                                >
                                                    HTML
                                                </button>

                                                <button
                                                    className="ml-5 content-card-link-button"
                                                    onClick={() => window.open(prefix + data.harKey)}
                                                >
                                                    Har
                                                </button>

                                            </div>

                                            <div id="previewScreenshotWrapper ">
                                                {
                                                    showImage && (
                                                        showScreenshot(data)
                                                    )
                                                }
                                            </div>

                                            <div id="previewPopupWrapper">
                                                {
                                                    showHtml && (
                                                        showPopup(data)
                                                    )
                                                }
                                            </div>

                                            <div id="previewRawHtmlWrapper">
                                                {
                                                    showRawHtml && (
                                                        showHtmlPreview(data)
                                                    )
                                                }
                                            </div>


                                            <div id='wappalyzer'>
                                                <Wappalyzer
                                                    visitId={visitId}
                                                    openTechnologies={openTechnologies}
                                                    setOpenTechnologies={setOpenTechnologies}
                                                    openUrls={openUrls}
                                                    setOpenUrls={setOpenUrls}
                                                />
                                            </div>

                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        );
                    })
                }
            </>
        );
    }


    // This file's HTML return.
    return (
        <>
            { renderHTML() }
        </>
    );
}

export default ContentCrawlCard;