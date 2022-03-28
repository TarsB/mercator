import {useEffect, useState} from "react";
import {Accordion, Button, Col, Row, Table} from "react-bootstrap";
import BorderWrapper from "react-border-wrapper";
import moment from "moment";
import api from "../../services/api";
import { checkObjectIsFalsy } from "../../services/Util";

const VATCard = (props) => {

    const visitId = props.visitId

    const [data, setData] = useState({});

    // api VAT
    useEffect(() => {
        const handlerData = async () => {

            const url = `/vatCrawlResults/search/findByVisitId?visitId=${visitId}`;
            await api.get(url)
                .then((resp) => {
                    if(resp.status === 200) {
                        setData(resp === undefined ? null : resp.data);
                    }
                })
                .catch((ex) => {
                    console.log(ex);
                });
        };
        
        handlerData();
    }, [visitId])    

    // data from props
    const {
        openVisitedUrlsVat,
        setOpenVisitedUrlsVat,
        openVatValues,
        setOpenVatValues,
    } = props;

    const topElement = <p className='top-element'>VAT Crawl</p>


    /*
    data.vatValues && data.vatValues.length ? 
        data.vatValues.length === 1 ? 
        data.vatValues : 
        STUFF : 
        'no vat found'

    if(data.vatValues && data.vatValues.length) {
        if(data.vatValues.length === 1) { //If only one, render one
            data.vatValues
        }
        else {
            STUFF
        }            
    }
    else {
        'no vat found'
    }
    */
   
    // Test push

    // Render data.vatValues
    const renderVAT = () => { // Inside td element
        if(!data.vatValues && !data.vatValues.length) { //Works?
            return (
                <p>No VAT found</p>
            );
        }
        if(data.vatValues.length === 1) {
            return (
                data.vatValues
            );
        }
        return (
            <>
                <button 
                    className='more-info'
                    onClick={() => setOpenVatValues(openVatValues => !openVatValues)} // Toggle openVatValues boolean
                > 
                    More info
                </button>

                {
                    openVatValues && ( // if openVatValues === true, render
                        <ul className="no-bullet mt-1 pl-0">
                            { 
                                data.vatValues.map((data, index) => {
                                    <li key={index}>
                                        { data }
                                    </li>
                                })
                            }
                        </ul>
                    )
                }
            </>
        );
    }

    // Render data.visitedUrls
    const renderFollowedUrls = () => { // Inside td element
        if(!data.visitedUrls && !data.visitedUrls.length) {
            return (
                ''
            );
        }

        return (
            <>
                <button 
                    className='more-info'
                    onClick={() => setOpenVisitedUrlsVat(openVisitedUrlsVat => !openVisitedUrlsVat)} // Toggle openVisitedUrlsVat boolean
                > 
                    More info
                </button>      

                {
                    openVisitedUrlsVat && ( // if openVisitedUrlsVat === true, render
                        <ul className="mt-2 no-bullet pl-0">
                            { 
                                data.visitedUrls.map((data, index) => {
                                    <li key={index} className="mt-1">
                                        { data }
                                    </li>
                                })
                            }
                        </ul>
                    )
                }      
            </>
        );
    }

    // Writing HTML on a function base so we can define logic more easily.
    const renderHTML = () => {

        const render = () => {
            if(checkObjectIsFalsy(data)) {
                return (
                    <p>No data for this visit.</p>
                )
            }

            return (
                <div className="vat-table">
                    <Table 
                        size='sm'
                        borderless
                    >
                        <tbody>

                            <tr>
                                <th scope="row">
                                    Id
                                </th>
                                <td>
                                    { data.id }
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    Crawl timestamp
                                </th>
                                <td>
                                    { // Ternary
                                        data.crawlStarted ? 
                                            moment(data.crawlStarted).format("DD/MM/YYYY HH:mm:ss") : 
                                            '' 
                                    }
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    Crawl duration
                                </th>
                                <td>
                                    { // Ternary
                                        data.crawlStarted && data.crawlFinished ?
                                            moment.duration(moment(data.crawlFinished).diff(moment(data.crawlStarted))).milliseconds() + ' ms' : 
                                            '' 
                                    }
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    VAT
                                </th>
                                <td>
                                    { renderVAT() }
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    URL
                                </th>
                                <td>
                                    { data.startUrl }
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    Matching URL
                                </th>
                                <td>
                                    { data.matchingUrl }
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    # URLs followed
                                </th>
                                <td>
                                    { data.visitedUrls ? data.visitedUrls.length : '' }
                                </td>
                            </tr>

                            <tr>
                                <th scope="row">
                                    URLs followed
                                </th>
                                <td>
                                    { renderFollowedUrls() }
                                </td>
                            </tr>

                        </tbody>
                    </Table>
                </div>
            )
        }

        return (
            <>
                <Row>
                    <Col className='mt-4'>
                        <BorderWrapper 
                            borderWidth="3px" 
                            borderRadius="0px" 
                            innerPadding="30px" 
                            topElement={topElement}
                            topPosition={0.07} 
                            topOffset="15px" 
                            topGap="15px"
                        >
                            {
                                render()
                            }
                        </BorderWrapper>
                    </Col>
                </Row>
            </>
        );
    }
    
    const oldHTML = () => {
        if (checkObjectIsFalsy(data)) {
            return (
                <>
                    <Row>
                        <Col className='mt-4'>
                            <BorderWrapper borderWidth="3px" borderRadius="0px" innerPadding="30px" topElement={topElement}
                                           topPosition={0.07} topOffset="15px" topGap="15px">
                                <p> no data for this visit</p>
                            </BorderWrapper>
                        </Col>
                    </Row>
                </>
            )
        }
    
        return (
            <Row>
                <Col className='mt-4'>
                    <BorderWrapper borderWidth="3px" borderRadius="0px" innerPadding="30px" topElement={topElement}
                                   topPosition={0.07} topOffset="15px" topGap="15px">
                        <div className="vat-table">
                            <Table size="sm" borderless>
                                <tbody className="text-left">
                                <tr>
                                    <th scope="row">Id</th>
                                    <td>{data.id}</td>
                                </tr>
                                <tr>
                                    <th scope="row">Crawl timestamp</th>
                                    <td>{data.crawlStarted ? moment(data.crawlStarted).format("DD/MM/YYYY HH:mm:ss") : ''}</td>
                                </tr>
                                <tr>
                                    <th scope="row">Crawl duration</th>
                                    <td>{data.crawlStarted && data.crawlFinished ?
                                        moment.duration(moment(data.crawlFinished).diff(moment(data.crawlStarted))).milliseconds() + ' ms'
                                        : ''}</td>
                                </tr>
                                <tr>
                                    <th scope="row">VAT</th>
                                    <td>{data.vatValues && data.vatValues.length ?
                                        data.vatValues.length === 1 ?
                                            data.vatValues
                                            :
                                            <Accordion>
                                                <Accordion.Toggle as={Button} className="toggle-button"
                                                                  id="button-vat-values"
                                                                  variant="link" eventKey="3"
                                                                  onClick={() => setOpenVatValues(!openVatValues)}>Found {data.vatValues.length} VAT
                                                    values</Accordion.Toggle>
                                                <Accordion.Collapse eventKey="3" in={openVatValues}>
                                                    <ul className="no-bullet mt-1 pl-0">
                                                        {data.vatValues.map((data, index) => (
                                                            <li key={index}>{data}</li>
                                                        ))}
                                                    </ul>
                                                </Accordion.Collapse>
                                            </Accordion>
                                        : 'No VAT found'}</td>
                                </tr>
                                <tr>
                                    <th scope="row">URL</th>
                                    <td>{data.startUrl}</td>
                                </tr>
                                <tr>
                                    <th scope="row">Matching URL</th>
                                    <td>{data.matchingUrl}</td>
                                </tr>
                                <tr>
                                    <th scope="row">#URLs followed</th>
                                    <td>{data.visitedUrls ? data.visitedUrls.length : ''}</td>
                                </tr>
    
                                <tr>
                                    <th scope="row">URLs followed</th>
                                    <td>{data.visitedUrls && data.visitedUrls.length ?
                                        <Accordion>
                                            <Accordion.Toggle as={Button} className="toggle-button"
                                                              id="button-visited-urls"
                                                              variant="link" eventKey="3"
                                                              onClick={() => setOpenVisitedUrlsVat(!openVisitedUrlsVat)}>URLs
                                                followed</Accordion.Toggle>
                                            <Accordion.Collapse eventKey="3" in={openVisitedUrlsVat}>
                                                <ul className="mt-2 no-bullet pl-0">
                                                    {data.visitedUrls.map((data, index) => (
                                                        <li className="mt-1" key={index}>{data}</li>
                                                    ))}
                                                </ul>
                                            </Accordion.Collapse>
                                        </Accordion>
                                        : ''}
    
                                    </td>
                                </tr>
                                </tbody>
                            </Table>
                        </div>
                    </BorderWrapper>
                </Col>
            </Row>
        )
    }

    // This file's HTML return.
    return (
        <>
            {
                // renderHTML()
                oldHTML()
            }
        </>
    );
}


export default VATCard;