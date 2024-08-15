

const path = require('path');
const vscode = require('vscode');
const axios = require('axios');

require('dotenv').config(); 
console.log(process.env.RAPIDAPI_KEY);

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
                } else {
                    vscode.window.showInformationMessage('No images found.');
                }
            }
        })
    );

    // Command to generate images
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
                    const imageUrl = await generateImage(prompt);
                    if (imageUrl) {
                        panel.webview.html = getWebviewContent([imageUrl],'Generating two more images...');

						 // Generate two more images with the same prompt
						 const imageUrl2 = await generateImage(prompt);
						 const imageUrl3 = await generateImage(prompt);
 
						 if (imageUrl2 && imageUrl3) {
							 // Append the new images to the webview
							 panel.webview.html = getWebviewContent([imageUrl, imageUrl2, imageUrl3]);
						 } else {
							 vscode.window.showInformationMessage('Failed to generate additional images.');
						 }

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
    const apiKey = 'UNSPLASH_API_KEY'; 
    const response = await axios.get(`https://api.unsplash.com/search/photos`, {
        params: {
            query: query,
            per_page: 5 // Number of images to retrieve
        },
        headers: {
            Authorization: `Client-ID ${apiKey}`
        }
    });

    return response.data.results.map(image => image.urls.regular);
}

async function generateImage(prompt) {
	console.log(process.env.RAPIDAPI_KEY);
    const options = {
        method: 'POST',
        url: 'https://animimagine-ai.p.rapidapi.com/generateImage',
        headers: {
            'x-rapidapi-key': 'RAPIDAPI_KEY',
            'x-rapidapi-host': 'animimagine-ai.p.rapidapi.com',
            'Content-Type': 'application/json'
        },
        data: {
            prompt: prompt
        }
    };

    try {
        const response = await axios.request(options);
        return response.data.imageUrl;
    } catch (error) {
        console.error(error);
        return null;
    }
}

// function getLoadingContent() {
//     return `<!DOCTYPE html>
//     <html lang="en">
//     <head>
//         <meta charset="UTF-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Generating Image</title>
//         <style>
//             body {
//                 display: flex;
//                 justify-content: center;
//                 align-items: center;
//                 height: 100vh;
//                 margin: 0;
//                 background-color: #030403;
//             }
//             .loader {
//                 border: 8px solid #f3f3f3;
//                 border-radius: 50%;
//                 border-top: 8px solid #3498db;
//                 width: 50px;
//                 height: 50px;
//                 animation: spin 1s linear infinite;
//             }
//             @keyframes spin {
//                 0% { transform: rotate(0deg); }
//                 100% { transform: rotate(360deg); }
//             }
//         </style>
//     </head>
//     <body>
//         <div class="loader"></div>
//     </body>
//     </html>`;
// }


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
    const imageElements = imageUrls.map(url => `<img src="${url}" alt="Image">`).join('');
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
            img {
                max-width: 300px;
                max-height: 300px;
                margin: 10px;
                border: 1px solid #ccc;
            }
            p {
                font-size: 16px;
                color: #333;
                margin: 0;
            }
        </style>
    </head>
    <body>
        <div class="image-container">
            ${imageElements}
        </div>
        <p>${message}</p>
    </body>
    </html>`;
}





function deactivate() {}

module.exports = {
    activate,
    deactivate
};
