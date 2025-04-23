// ==UserScript==
// @name          Day1 AMZN Price
// @namespace     http://tampermonkey.net/
// @version       2025-04-23
// @description   Script to display day 1 stock price for an Amazoian on their PhoneTool page. (Uses Yahoo! Finance's download endpoint that provides a JSON of the stock quote.). Based on the original AMZN on PT plugin developed by Sumeet Mulani <mulanis@amazon.com>
// @author        Leon Anderson <lleoand@amazon.com>
// @updateURL     https://github.com/leonanderson88/grimsby-csv-exporter/raw/refs/heads/main/grimsby-csv-exporter.user.js
// @downloadURL   https://github.com/leonanderson88/grimsby-csv-exporter/raw/refs/heads/main/grimsby-csv-exporter.user.js
// @match         https://phonetool.amazon.com/users/*
// @exclude       https://phonetool.amazon.com/users/*/org
// @icon          data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABVUlEQVRYhe2XMS9DURTHf1ckLxJNNWGqNC9CxIKBuSXsnRjs1aFDv4DJF6gNg1gMTD6Aod0NZWnE0oGlDCXE0t5jaDQE950mmg7uSe7wkt8753f/Z3nPoKl9WQCKQIgh42SFMoYmhhI5U4lqbSKHH0gcoYohVMl+lVkkb65cyLCizTGGcPT+konrE+L1shN+CjM8zG/xklwCKAErLl6TgADMnG4w8nij8IW38VluN886D9vGOUOTAABBo4YF7tZ2ac5lf2TGaudMXuwQNGratgxpQRFBRHhNLv/KPE+tdjltqROw1gIwfbTu5tSjexTo5VZ9EfhI4P8K+BX4BAYu4FcwcAG/Ap/AwAX8CnwC/RJQf5bbRKr7yR11bCL1pwJVgFa6QDuIYa11nnYQo5UudN4U6lHNo3/NDiWNUFaIfi+hSN7suZDoBHKmgpDV3OZTNTXDAd4Bh5nLjwk9nN8AAAAASUVORK5CYII=
// @grant         GM_xmlhttpRequest
// ==/UserScript==

// For distribution
// https://github.com/leonanderson88/day1-amzn-price/raw/refs/heads/main/day1-amzn-price.user.js

(function () {
  "use strict";

  // console.log("START");

  function waitForElement(root, selector) {
    return new Promise((resolve, reject) => {
      new MutationObserver(check).observe(root, {
        childList: true,
        subtree: true,
      });
      function check(changes, observer) {
        // console.log("checking");
        let element = root.querySelector(selector);
        if (element) {
          // console.log("FOUND ELEMENT:", element);
          observer.disconnect();
          resolve(element);
        }
      }
    });
  }

  async function addHistoricalStockPriceRow() {
    let label = document.createElement("dt");
    label.id = "historyStockPriceLbl";
    label.innerText = "Day1 AMZN Price:";

    let value = document.createElement("dd");
    value.id = "historyStockPrice";
    value.innerText = "Loading...";

    let horizontal = await waitForElement(document, ".dl-horizontal");
    horizontal.append(label, value);

    return value;
  }

  function updateStockPrice(element, stockPrice) {
    let textElement = document.createElement("strong");
    textElement.innerText = `US$${stockPrice}`;
    element.innerText = "";
    element.append(textElement);
  }

  async function getHireDate() {
    let hireDate = await waitForElement(
      document,
      "div.HireDateRow .TableValue"
    );
    // console.log("HIRE DATE ELEMENT");
    // console.log(hireDate);

    return hireDate?.innerText && hireDate.innerText.length > 0
      ? new Date(`${hireDate.innerText.trim()} UTC`)
      : null;
  }

  function parseStockPrice(jsonData) {
    let stockPrice = null;
    let parsedData = null;
    try {
      parsedData = JSON.parse(jsonData);
    } catch (e) {}
    if (parsedData && parsedData.chart && parsedData.chart.result) {
      stockPrice = parseFloat(
        parsedData.chart.result[0].indicators.quote[0].close[0]
      ).toFixed(2);
    }
    return stockPrice ? stockPrice : " Error";
  }

  async function fetchStockData(priceValueElement) {
    let hireDate = await getHireDate();
    if (!hireDate) {
      updateStockPrice(priceValueElement, " Error");
      return;
    }
    // console.log("HIRE DATE");
    // console.log(hireDate);

    let hireDateStr = hireDate.toISOString().split("T")[0];
    // console.log("HIRE DATE STRING");
    // console.log(hireDateStr);

    let hireDatePlus = new Date(hireDate);
    hireDatePlus.setDate(hireDatePlus.getDate() + 4); // adding 4 buffer days for missing data
    // console.log("HIRE DATE PLUS");
    // console.log(hireDatePlus);

    let hireDatePlusStr = hireDatePlus.toISOString().split("T")[0];
    // console.log("HIRE DATE PLUS STRING");
    // console.log(hireDatePlusStr);

    let period1 = new Date(hireDateStr).getTime() / 1000;
    let period2 = new Date(hireDatePlusStr).getTime() / 1000;
    // console.log("PERIOD 1 AND 2");
    // console.log(period1);
    // console.log(period2);

    let stockUrl = `https://query1.finance.yahoo.com/v8/finance/chart/AMZN?period1=${period1}&period2=${period2}&interval=1d&events=history&includeAdjustedClose=true`;
    // console.log(stockUrl);

    GM_xmlhttpRequest({
      method: "GET",
      url: stockUrl,
      onload: (response) => {
        // console.log("RESPONSE TEXT");
        // console.log(response.responseText);
        let stockPrice = parseStockPrice(response.responseText);
        updateStockPrice(priceValueElement, stockPrice);
      },
    });
  }

  window.addEventListener(
    "load",
    async () => {
      // console.log("WINDOW LOADED");

      let priceValueElement = await addHistoricalStockPriceRow();
      await fetchStockData(priceValueElement);
    },
    false
  );
})();
