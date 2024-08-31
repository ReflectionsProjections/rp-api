const templates = {
    REGISTRATION_CONFIRMATION: `<!DOCTYPE html>
        <html>
            <body>
                <div class="container">
                    <h1>Here is your magic link:</h1>
                    <div class="magic_link">{{magic_link}}</div>
                </div>
            </body>
        </html>x
    `,

    SPONSOR_VERIFICATION: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
        <style>
            body {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 50vh;
                margin: 0;
                font-family: Arial, sans-serif;
                background-color: #f7f7f7;
            }
            .container {
                background-color: #ffffff;
                padding: 20px 40px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                border-radius: 10px;
                text-align: center;
            }
            h1 {
                font-size: 24px;
                color: #333333;
                margin-bottom: 10px;
            }
            .code {
                font-size: 32px;
                font-weight: bold;
                color: #e74c3c;
                letter-spacing: 2px;
                background-color: #f2f2f2;
                padding: 10px 20px;
                border-radius: 5px;
                display: inline-block;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Here is your verification code:</h1>
            <div class="code">{{code}}</div>
        </div>
    </body>
    </html>`,
};

export default templates;
