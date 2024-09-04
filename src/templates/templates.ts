const templates = {
    REGISTRATION_CONFIRMATION: `<!DOCTYPE html>
        <html>
            <body>
                <div class="container">
                    <p> Thank you for registering for R|P 2024. We have recieved your information, and will be sending next steps shortly.  </p>
                    
                    <p> Need to update your resume? Use 
                        <a href="{{magic_link}}">this</a>
                    magic link to do so! This is a UNIQUE link for you - for your privacy and safety, please do not share this link with anyone else. </p>

                    <p> For your reference, your application contained the following information: </p>
                    <ul>
                        <li> <b> Name: </b>  {{name}} </li>
                        <li> <b> Email: </b>  {{email}} </li>
                        <li> <b> University: </b>  {{university}} </li>
                        <li> <b> Major: </b>  {{major}} </li>
                        <li> <b> Degree: </b>  {{degree}} </li>
                        <li> <b> Graduation Year: </b>  {{graduation}} </li>
                        <li> <b> Dietary Restrictions: </b> {{dietaryRestrictions}} </li>
                        <li> <b> Allergies: </b> {{allergies}} </li>
                        <li> <b> Gender: </b> {{gender}} </li>
                        <li> <b> Ethnicity: </b> {{ethnicity}} </li>
                        <li> <b> Portfolios: </b> {{portfolios}} </li>
                        <li> <b> Job Interest: </b> {{jobInterest}} </li>
                    </ul>

                </div>
            </body>
        </html>
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
