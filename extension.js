

const path = require('path');
const vscode = require('vscode');
const axios = require('axios');

require('dotenv').config(); 

const config = require('./config');

const unsplashKey = Buffer.from(config.UNSPLASH_API_KEY, 'base64').toString('utf-8');
const rapidApiKey = Buffer.from(config.RAPIDAPI_KEY, 'base64').toString('utf-8');
const rapidApiHost = Buffer.from(config.RAPIDAPI_HOST, 'base64').toString('utf-8');

//this calls searchImages and generateImage functions
function activate(context) {
    // Command to search images
    context.subscriptions.push(
        vscode.commands.registerCommand('imagenica.searchImages', async () => {
            const searchQuery = await vscode.window.showInputBox({
                prompt: 'Enter image search query',
                placeHolder: 'e.g., nature, cats, technology'
            });

            if (searchQuery) {
                const images = await searchImages(searchQuery);
                if (images.length > 0) {
                    const panel = vscode.window.createWebviewPanel(
                        'imageSearchPanel',
                        'Image Search Results',
                        vscode.ViewColumn.One,
                        {
                            enableScripts: true,
                        }
                    );

                    panel.webview.html = getWebviewContent(images);

                    panel.webview.onDidReceiveMessage(async (message) => {
                        if (message.command === 'downloadImage') {
                            const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0] && vscode.workspace.workspaceFolders[0].uri.fsPath;
                            if (!workspaceFolder) {
                                vscode.window.showErrorMessage('No workspace folder found.');
                                return;
                            }

                            try {
                                const response = await axios.get(message.imageUrl, { responseType: 'arraybuffer' });
                                //unique file name with a .jpg extension
                                const timestamp = Date.now(); //timestamp for uniqueness
                                const fileName = `image_${timestamp}.jpg`;
                                const filePath = path.join(workspaceFolder, fileName);
                                require('fs').writeFileSync(filePath, response.data);

                                vscode.window.showInformationMessage(`Image downloaded as ${fileName}`);
                            } catch (error) {
                                vscode.window.showErrorMessage('Error downloading the image.');
                                console.error(error);
                            }
                        }
                    });
                } else {
                    vscode.window.showInformationMessage('No images found.');
                }
            }
        })
    );

    // generate images
    context.subscriptions.push(
        vscode.commands.registerCommand('imagenica.generateImage', async () => {
            const prompt = await vscode.window.showInputBox({
                prompt: 'Enter image prompt',
                placeHolder: 'e.g., anime girl in space eating burger'
            });

            if (prompt) {
                const panel = vscode.window.createWebviewPanel(
                    'imageGenerationPanel',
                    'Image Generator',
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                    }
                );

                panel.webview.html = getLoadingContent('Generating your images...');

                try {
                    const imageData = await generateImage(prompt);
                    if (imageData) {
                        panel.webview.html = getWebviewContent([imageData], 'Generation Done!');

						 // Handle messages from the webview
                         panel.webview.onDidReceiveMessage(async (message) => {
                            if (message.command === 'downloadImage') {
                                const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0] && vscode.workspace.workspaceFolders[0].uri.fsPath;
                                if (!workspaceFolder) {
                                    vscode.window.showErrorMessage('No workspace folder found.');
                                    return;
                                }
    
                                try {
                                    const response = await axios.get(message.imageUrl, { responseType: 'arraybuffer' });
                                    const timestamp = Date.now(); // timestamp for uniqueness
                                    const fileName = `image_${timestamp}.jpg`;
                                    const filePath = path.join(workspaceFolder, fileName);
                                    require('fs').writeFileSync(filePath, response.data);
    
                                    vscode.window.showInformationMessage(`Image downloaded as ${fileName}`);
                                } catch (error) {
                                    vscode.window.showErrorMessage('Error downloading the image.');
                                    console.error(error);
                                }
                            }
                        });

                    } else {
                        vscode.window.showInformationMessage('Image generation failed.');
                        panel.webview.html = getErrorContent();
                    }
                } catch (error) {
                    vscode.window.showErrorMessage('An error occurred while generating the image.');
                    console.error(error);
                    panel.webview.html = getErrorContent();
                }
            }
        })
    );
}

async function searchImages(query) {
    //const apiKey = process.env.UNSPLASH_API_KEY; 
    const response = await axios.get(`https://api.unsplash.com/search/photos`, {
        params: {
            query: query,
            per_page: 5 // Number of images to retrieve
        },
        headers: {
            Authorization: `Client-ID ${unsplashKey}`
        }
    });

    return response.data.results.map(image => image.urls.regular);
}


async function generateImage(prompt) {
    const options = {
        method: 'POST',
        url: 'https://ai-image-generator10.p.rapidapi.com/image_gen_v2',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': rapidApiHost,
          'Content-Type': 'application/json'
        },
        data: {
          query: prompt
        }
      };

      try {
        const response = await axios.request(options);

        // `response.data.imageData` contains the base64 image string
        const imageData = response.data.imageData;

        if (imageData.startsWith('data:image/')) {
            return imageData; 
        } else {
            // Fallback: Wrap it with the appropriate data URI prefix
            return `data:image/jpeg;base64,${imageData}`;
        }
    } catch (error) {
        console.error('Error during image generation:', error);
        return null;
    }

}


function getLoadingContent(message) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Generating Images</title>
        <style>
            body {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #030403;
                text-align: center;
            }
            .loader {
                width: 50px;
                height: 50px;
                background-color: #3498db;
                border-radius: 50%;
                position: relative;
                animation: bounce 1.5s infinite;
            }
            .loader:before {
                content: '';
                position: absolute;
                top: -15px;
                left: -15px;
                width: 80px;
                height: 80px;
                border-radius: 50%;
                border: 4px solid #3498db;
                border-top-color: transparent;
                animation: spin 1s linear infinite;
            }
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% {
                    transform: translateY(0);
                }
                40% {
                    transform: translateY(-30px);
                }
                60% {
                    transform: translateY(-15px);
                }
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            p {
                margin-top: 20px;
                font-size: 16px;
                color: #333;
            }
        </style>
    </head>
    <body>
        <div class="loader"></div>
		<br/>
        <p>${message}</p>
    </body>
    </html>`;
}

function getErrorContent() {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <style>
            body {
                display: flex;
				flex-direction: column;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #030403;
                color: #ff0000;
                font-family: Arial, sans-serif;
                text-align: center;
            }
        </style>
    </head>
    <body>
        <h1>Something went wrong!</h1>
        <p>Please try again later.</p>
        <p>Check your network connection.</p>
    </body>
    </html>`;
}

function getWebviewContent(imageUrls, additionalMessage) {
    const imageElements = imageUrls
        .map(
            (url, index) => `
            <div class="image-item">
                <img src="${url}" alt="Image ${index + 1}">
                <button class="download-btn" data-url="${url}">Download Image ${index + 1}</button>
            </div>`
        )
        .join('');
    const message = additionalMessage ? `<p>${additionalMessage}</p>` : '';

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Image Results</title>
        <style>
            body {
                margin: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                background-color: #030403;
                text-align: center;
                padding: 20px;
            }
            .image-container {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                margin-bottom: 20px;
            }
            .image-item {
                margin: 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            img {
                max-width: 300px;
                max-height: 300px;
                border: 1px solid #ccc;
            }
            button {
                padding: 10px 20px;
                font-size: 14px;
                margin-top: 10px;
                cursor: pointer;
                background-color: #0078d4;
                color: white;
                border: none;
                border-radius: 5px;
            }
            button:hover {
                background-color: #005a9e;
            }
        </style>
    </head>
    <body>
        <div class="image-container">
            ${imageElements}
        </div>
        <p>${message}</p>
        <script>
            const vscode = acquireVsCodeApi();
            document.querySelectorAll('.download-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const imageUrl = button.getAttribute('data-url');
                    vscode.postMessage({ command: 'downloadImage', imageUrl });
                });
            });
        </script>
    </body>
    </html>`;
}





function deactivate() {}

module.exports = {
    activate,
    deactivate
};
