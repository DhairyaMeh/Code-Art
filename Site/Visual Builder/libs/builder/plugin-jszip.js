Vvveb.Gui.download = function () {
  let assets = [];

  function addUrl(url, href, binary) {
    assets.push({ url, href, binary });
  }

  let html = Vvveb.Builder.frameHtml;

  // Stylesheets
  html.querySelectorAll("link[href$='.css']").forEach((e) => {
    addUrl(e.href, e.getAttribute("href"), false);
  });

  // JavaScripts
  html.querySelectorAll("script[src$='.js']").forEach((e) => {
    addUrl(e.src, e.getAttribute("src"), false);
  });

  // Images
  html.querySelectorAll("img[src]").forEach((e) => {
    addUrl(e.src, e.getAttribute("src"), true);
  });

  let zip = new JSZip();
  let promises = [];

  assets.forEach((asset) => {
    let { url, href, binary } = asset;

    let filename = href.substring(href.lastIndexOf('/') + 1);
    let path = href.substring(0, href.lastIndexOf('/')).replace(/\.\.\//g, "");
    if (href.indexOf("://") > 0) {
      path = ""; // Ignore path for external assets
    }

    promises.push(
      new Promise((resolve) => {
        let request = new XMLHttpRequest();
        request.open('GET', url);
        request.responseType = binary ? 'blob' : 'text';

        request.onload = function () {
          if (request.status === 200) {
            resolve({ url, href, filename, path, binary, data: request.response, status: request.status });
          } else {
            console.error(`Error loading ${url}: ${request.statusText}`);
            resolve({ status: request.status });
          }
        };

        request.onerror = function () {
          console.error(`Network error while fetching ${url}`);
          resolve({ status: 0 });
        };

        try {
          request.send();
        } catch (error) {
          console.error(`Failed to send request for ${url}: ${error}`);
          resolve({ status: 0 });
        }
      })
    );
  });

  Promise.all(promises)
    .then((data) => {
      let htmlContent = Vvveb.Builder.getHtml();

      data.forEach((file) => {
        if (file.status === 200) {
          let folder = zip;
          if (file.path) {
            file.path = file.path.replace(/^\//, "");
            folder = zip.folder(file.path);
          }

          let newUrl = (file.path ? file.path + "/" : "") + file.filename.trim().replace(/^\//, "");
          htmlContent = htmlContent.replace(file.href, newUrl);

          folder.file(file.filename, file.data, { base64: file.binary });
        }
      });

      zip.file("index.html", htmlContent);
      zip
        .generateAsync({ type: "blob" })
        .then((content) => {
          saveAs(content, "CodeArt.zip");
        })
        .catch((error) => {
          console.error(`Error generating zip file: ${error}`);
        });
    })
    .catch((error) => {
      console.error(`Error processing assets: ${error}`);
    });
};
